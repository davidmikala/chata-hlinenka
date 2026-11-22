<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Prague');
ini_set('session.use_strict_mode', '1');
session_name('HLINENKA_ADMIN');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Strict']);
session_start();

const OWNER_MAIL = 'david@mikala.cz';
const SENDER_MAIL = 'rezervace@chatahlinenka.cz';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, max-age=0');

// Nezavazny health-check pouze pro overeni dostupnosti PHP (bez pristupu k datům).
if (($_GET['action'] ?? '') === 'health') {
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":true,"service":"php"}';
    exit;
}

function send_json(array $value, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function err(string $message, int $status = 400): never { send_json(['ok' => false, 'message' => $message], $status); }
function valid_day(string $s): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $s)) return false;
    [$y, $m, $d] = array_map('intval', explode('-', $s));
    return checkdate($m, $d, $y);
}
function days_between(string $a, string $b): int {
    return (int)((strtotime($b.' 12:00:00 UTC') - strtotime($a.' 12:00:00 UTC')) / 86400);
}
function is_admin(): bool { return ($_SESSION['admin'] ?? false) === true; }
function require_admin(): void { if (!is_admin()) err('Pro správu rezervací je nutné přihlášení.', 401); }
function payload(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 1500000) err('Příliš velký požadavek.', 413);
    $v = json_decode($raw, true);
    if (!is_array($v)) err('Neplatný formát požadavku.');
    return $v;
}
function required_text(mixed $v, int $max, string $field): string {
    if (!is_string($v)) err('Chybí pole '.$field.'.');
    $s = trim($v);
    if ($s === '' || mb_strlen($s, 'UTF-8') > $max) err('Zkontrolujte pole '.$field.'.');
    return $s;
}
function data_store(callable $fn): mixed {
    // Data hostu jsou mimo public_html, nikdy nejsou vystavená jako soubory webu.
    $folder = dirname(__DIR__, 2).'/.hlinenka-private';
    if (!is_dir($folder) && !@mkdir($folder, 0700, true) && !is_dir($folder)) {
        err('Uložiště rezervací není na hostingu přístupné. Kontaktujte provozovatele.', 503);
    }
    $path = $folder.'/reservations.json';
    $h = @fopen($path, 'c+');
    if (!$h) err('Rezervační systém není připraven k ukládání.', 503);
    try {
        if (!flock($h, LOCK_EX)) err('Uložiště je dočasně nedostupné.', 503);
        rewind($h);
        $raw = stream_get_contents($h);
        $d = json_decode($raw ?: '', true);
        if (!is_array($d)) $d = ['records' => [], 'pricing' => ['base' => 0, 'rates' => []], 'otp' => null, 'last_code_at' => 0, 'ip_times' => []];
        $save = false;
        $result = $fn($d, $save);
        if ($save) {
            $json = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
            if ($json === false) err('Nepodařilo se uložit změny.', 500);
            rewind($h);
            if (!ftruncate($h, 0) || fwrite($h, $json) === false || !fflush($h)) err('Uložení se nezdařilo.', 500);
        }
        return $result;
    } finally {
        flock($h, LOCK_UN);
        fclose($h);
    }
}
function overlaps(array $rows, string $start, string $end, ?string $ignore = null): bool {
    foreach ($rows as $r) {
        if (($r['status'] ?? '') === 'approved' && ($r['id'] ?? '') !== $ignore &&
            $start < ($r['end'] ?? '') && $end > ($r['start'] ?? '')) return true;
    }
    return false;
}
// Schválený ceník za celou chatu – balíčky pobytů, nikoli cena za každý den.
// Staré orientační denní sazby z prototypu se pro výpočet nepoužívají.
function pricing_values(array $d): array {
    $defaults = ['offShort' => 20000, 'offWeek' => 28000, 'extraNight' => 5000, 'summerShort' => 28000, 'summerWeek' => 35000];
    $custom = $d['pricing'] ?? [];
    if (!is_array($custom)) return $defaults;
    foreach ($defaults as $key => $value) {
        if (isset($custom[$key]) && is_int($custom[$key]) && $custom[$key] > 0) {
            $defaults[$key] = $custom[$key];
        }
    }
    return $defaults;
}
function season_for_night(string $day): string {
    $mday = substr($day, 5); // MM-DD
    // Svátky z původního kalendáře: 22.12. až 2.1. včetně – cena na vyžádání.
    if ($mday >= '12-22' || $mday < '01-03') return 'holiday';
    if ($mday >= '07-01' && $mday < '09-01') return 'summer';
    return 'off';
}
function price_quote(array $d, string $start, string $end): array {
    $p = pricing_values($d);
    $nights = days_between($start, $end);
    $seasons = [];
    for ($i = 0; $i < $nights; $i++) {
        $day = gmdate('Y-m-d', strtotime($start.' 12:00:00 UTC') + $i * 86400);
        $seasons[season_for_night($day)] = true;
    }
    $type = count($seasons) === 1 ? array_key_first($seasons) : 'mixed';
    $minimum = $type === 'summer' || isset($seasons['summer']) ? 4 : 2;
    $total = null;
    $label = match ($type) {
        'off' => 'Mimo sezónu',
        'summer' => 'Letní prázdniny',
        'holiday' => 'Vánoce a Silvestr',
        default => 'Pobyt přes různá období',
    };
    if ($nights >= $minimum && $type === 'off') {
        if ($nights <= 7) {
            // 2 i 3 noci stejná cena. 4–6 nocí nesmí být dražších než celý týden.
            $total = min($p['offWeek'], $p['offShort'] + max(0, $nights - 3) * $p['extraNight']);
        } else {
            $weeks = intdiv($nights, 7);
            $remaining = $nights % 7;
            $total = $weeks * $p['offWeek'] + min($p['offWeek'], $remaining * $p['extraNight']);
        }
    } elseif ($nights >= $minimum && $type === 'summer') {
        if ($nights === 4) {
            $total = $p['summerShort'];
        } elseif ($nights <= 7) {
            $total = $p['summerWeek'];
        } else {
            $weeks = intdiv($nights, 7);
            $remaining = $nights % 7;
            $total = $weeks * $p['summerWeek'] + $remaining * $p['extraNight'];
        }
    }
    // Svátky a pobyty zasahující přes více sezón potvrzuje vždy provozovatel.
    return ['nights' => $nights, 'min' => $minimum, 'total' => $total, 'label' => $label, 'type' => $type];
}
// Bezpečná konfigurace SMTP je uložena MIMO public_html v souboru
// .hlinenka-private/smtp-config.php (ne v GitHubu).
// Pokud není nastavená, používá se dosavadní PHP mail() jako záloha.
// Úspěch SMTP/mail() znamená předání poštovnímu serveru, nikoli potvrzené doručení.
function smtp_settings(): ?array {
    $privatePath = dirname(__DIR__, 2).'/.hlinenka-private/smtp-config.php';
    if (!is_file($privatePath)) return null;
    $v = @include $privatePath;
    if (!is_array($v)) return null;
    $host = (string)($v['host'] ?? '');
    $user = (string)($v['user'] ?? '');
    $pass = (string)($v['password'] ?? '');
    $from = (string)($v['from'] ?? $user);
    $port = (int)($v['port'] ?? 587);
    if ($host === '' || preg_match('/[^a-zA-Z0-9.-]/', $host) ||
        !in_array($port, [465, 587], true) || $pass === '' ||
        !filter_var($user, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
        error_log('Hlinenka: neplatna konfigurace SMTP');
        return null;
    }
    return ['host' => $host, 'port' => $port, 'user' => $user,
        'password' => $pass, 'from' => $from];
}
function mail_transport_name(): string { return smtp_settings() ? 'smtp' : 'php-mail'; }

function smtp_send_text(array $cfg, string $to, string $subject, string $body, ?string $replyTo): bool {
    $connection = null;
    try {
        $host = $cfg['host'];
        $port = $cfg['port'];
        $uri = ($port === 465 ? 'ssl://' : 'tcp://').$host.':'.$port;
        $ctx = stream_context_create(['ssl' => [
            'verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host
        ]]);
        $connection = @stream_socket_client($uri, $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $ctx);
        if (!is_resource($connection)) throw new RuntimeException('Nelze navazat SMTP spojeni');
        stream_set_timeout($connection, 15);
        $read = static function (array $expected) use (&$connection): void {
            $last = '';
            do {
                $line = fgets($connection, 2048);
                if ($line === false) throw new RuntimeException('SMTP neodpovida');
                $last = $line;
            } while (strlen($line) > 3 && $line[3] === '-');
            if (!in_array(substr($last, 0, 3), $expected, true)) {
                throw new RuntimeException('SMTP odpoved '.substr($last, 0, 3));
            }
        };
        $cmd = static function (string $line, array $expected) use (&$connection, $read): void {
            if (fwrite($connection, $line."\r\n") === false) {
                throw new RuntimeException('SMTP zapis selhal');
            }
            $read($expected);
        };
        $read(['220']);
        $cmd('EHLO chatahlinenka.cz', ['250']);
        if ($port === 587) {
            $cmd('STARTTLS', ['220']);
            if (@stream_socket_enable_crypto($connection, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
                throw new RuntimeException('Nelze overit TLS certifikat SMTP');
            }
            $cmd('EHLO chatahlinenka.cz', ['250']);
        }
        $cmd('AUTH LOGIN', ['334']);
        $cmd(base64_encode($cfg['user']), ['334']);
        $cmd(base64_encode($cfg['password']), ['235']);
        $cmd('MAIL FROM:<'.$cfg['from'].'>', ['250']);
        $cmd('RCPT TO:<'.$to.'>', ['250', '251']);
        $cmd('DATA', ['354']);
        $subjectEncoded = '=?UTF-8?B?'.base64_encode($subject).'?=';
        $headers = [
            'Date: '.date(DATE_RFC2822),
            'From: Chata Hlinenka <'.$cfg['from'].'>',
            'To: <'.$to.'>',
            'Subject: '.$subjectEncoded,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers[] = 'Reply-To: <'.$replyTo.'>';
        }
        $normalized = str_replace(["\r\n", "\r"], "\n", $body);
        $normalized = implode("\r\n", array_map(
            static fn(string $line): string => str_starts_with($line, '.') ? '.'.$line : $line,
            explode("\n", $normalized)
        ));
        $payload = implode("\r\n", $headers)."\r\n\r\n".$normalized."\r\n.\r\n";
        if (fwrite($connection, $payload) !== strlen($payload)) {
            throw new RuntimeException('SMTP zprava nebyla cela zapsana');
        }
        $read(['250']);
        $cmd('QUIT', ['221']);
        return true;
    } catch (Throwable $e) {
        // Nezapisovat do logu obsah zpravy ani prihlasovaci udaje.
        error_log('Hlinenka: SMTP odeslani selhalo: '.$e->getMessage());
        return false;
    } finally {
        if (is_resource($connection)) fclose($connection);
    }
}

function send_mail_text(string $to, string $subject, string $message, ?string $replyTo = null): bool {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) ||
        ($replyTo !== null && !filter_var($replyTo, FILTER_VALIDATE_EMAIL))) return false;
    $smtp = smtp_settings();
    if ($smtp !== null) {
        // Pri selhani SMTP nespoustet automaticky php mail(), aby nevznikaly duplicity.
        return smtp_send_text($smtp, $to, $subject, $message, $replyTo);
    }
    $headers = [
        'From: Chata Hlinenka <'.SENDER_MAIL.'>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8'
    ];
    if ($replyTo) $headers[] = 'Reply-To: <'.$replyTo.'>';
    $accepted = @mail($to, '=?UTF-8?B?'.base64_encode($subject).'?=', $message, implode("\r\n", $headers));
    if (!$accepted) error_log('Hlinenka: PHP mail() neprevzal zpravu');
    return $accepted;
}
function check_dates(string $start, string $end): int {
    if (!valid_day($start) || !valid_day($end)) err('Vyberte platná data.');
    $n = days_between($start, $end);
    if ($n < 1 || $n > 60) err('Pobyt musí trvat 1 až 60 nocí.');
    return $n;
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = (string)($_GET['action'] ?? 'calendar');

if ($method === 'GET') {
    if ($action === 'calendar') {
        $view = data_store(function(array &$d, bool &$save) {
            return [
                'occupied' => array_values(array_map(fn($r) => ['start' => $r['start'], 'end' => $r['end']],
                    array_filter($d['records'] ?? [], fn($r) => ($r['status'] ?? '') === 'approved'))),
                'pricing' => pricing_values($d),
            ];
        });
        send_json(['ok' => true] + $view);
    }
    if ($action === 'quote') {
        $start = (string)($_GET['start'] ?? '');
        $end = (string)($_GET['end'] ?? '');
        check_dates($start, $end);
        $view = data_store(fn(array &$d, bool &$save) => price_quote($d, $start, $end));
        send_json(['ok' => true] + $view);
    }
    if ($action === 'ical') {
        $rows = data_store(fn(array &$d, bool &$save) => array_values(array_filter($d['records'] ?? [], fn($r) => ($r['status'] ?? '') === 'approved')));
        header('Content-Type: text/calendar; charset=utf-8');
        header('Content-Disposition: inline; filename="hlinenka-obsazenost.ics"');
        echo "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Chata Hlinenka//Rezervace//CS\r\nCALSCALE:GREGORIAN\r\n";
        foreach ($rows as $r) {
            echo "BEGIN:VEVENT\r\nUID:".preg_replace('/[^a-zA-Z0-9-]/', '', (string)$r['id'])."@chatahlinenka.cz\r\n";
            echo "DTSTAMP:".gmdate('Ymd\THis\Z')."\r\n";
            echo "DTSTART;VALUE=DATE:".str_replace('-', '', $r['start'])."\r\nDTEND;VALUE=DATE:".str_replace('-', '', $r['end'])."\r\n";
            echo "SUMMARY:Obsazeno\r\nEND:VEVENT\r\n";
        }
        echo "END:VCALENDAR\r\n"; exit;
    }
    if ($action === 'admin') {
        require_admin();
        $d = data_store(fn(array &$d, bool &$save) => $d);
        unset($d['otp'], $d['last_code_at'], $d['ip_times']);
        send_json(['ok' => true, 'records' => $d['records'] ?? [], 'pricing' => pricing_values($d)]);
    }
    if ($action === 'session') send_json(['ok' => true, 'admin' => is_admin()]);
    err('Neznámý požadavek.', 404);
}
if ($method !== 'POST') err('Nepodporovaná metoda.', 405);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    $host = parse_url($origin, PHP_URL_HOST);
    $current = $_SERVER['HTTP_HOST'] ?? '';
    if (!$host || !in_array($host, ['chatahlinenka.cz', 'www.chatahlinenka.cz', 'localhost'], true)
        || ($current !== '' && strcasecmp($host, explode(':', $current)[0]) !== 0)) err('Nepovolený požadavek.', 403);
}
$body = payload();

if ($action === 'inquiry') {
    $start = (string)($body['start'] ?? ''); $end = (string)($body['end'] ?? '');
    $nights = check_dates($start, $end);
    if ($start < date('Y-m-d')) err('Datum příjezdu musí být dnes nebo později.');
    $name = required_text($body['name'] ?? null, 100, 'jméno');
    $phone = required_text($body['phone'] ?? null, 40, 'telefon');
    $email = required_text($body['email'] ?? null, 150, 'e-mail');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) err('Zkontrolujte e-mail.');
    $people = filter_var($body['people'] ?? null, FILTER_VALIDATE_INT);
    if ($people === false || $people < 1 || $people > 12) err('Počet hostů musí být mezi 1 a 12.');
    $message = trim((string)($body['message'] ?? ''));
    if (mb_strlen($message, 'UTF-8') > 2000) err('Zpráva je příliš dlouhá.');
    // Nenápadná ochrana proti botům.
    if (trim((string)($body['website'] ?? '')) !== '') send_json(['ok' => true]);
    $result = data_store(function(array &$d, bool &$save) use($start, $end, $name, $phone, $email, $people, $message, $nights) {
        if (overlaps($d['records'] ?? [], $start, $end)) return ['error' => 'Zvolený termín je obsazený.'];
        $q = price_quote($d, $start, $end);
        if ($nights < $q['min']) return ['error' => 'Minimální délka pobytu v tomto období je '.$q['min'].' nocí.'];
        $ip = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? ''));
        $now = time();
        $d['ip_times'] = array_filter($d['ip_times'] ?? [], fn($ts) => $ts > $now - 86400);
        if (($d['ip_times'][$ip] ?? 0) > $now - 45) return ['error' => 'Další poptávku lze odeslat až za chvíli.'];
        $d['ip_times'][$ip] = $now;
        $record = ['id' => bin2hex(random_bytes(12)), 'start' => $start, 'end' => $end, 'name' => $name,
            'phone' => $phone, 'email' => $email, 'people' => $people, 'message' => $message,
            'price' => $q['total'], 'status' => 'pending', 'source' => 'Web', 'createdAt' => date(DATE_ATOM)];
        $d['records'][] = $record;
        $save = true;
        return ['record' => $record];
    });
    if (isset($result['error'])) err($result['error'], 409);
    $r = $result['record'];
    $text = "Nová poptávka Chaty Hliněnka\n\nJméno: $name\nE-mail: $email\nTelefon: $phone\nPočet hostů: $people\nTermín: $start až $end\nNocí: $nights\n"
        . "Orientační cena: ".($r['price'] === null ? 'Na vyžádání' : number_format($r['price'], 0, ',', ' ').' Kč')
        . "\nPoznámka: $message\n\nČeká na schválení. Správa: https://www.chatahlinenka.cz/sprava-rezervaci.html";
    $notified = send_mail_text(OWNER_MAIL, 'Nová poptávka ubytování – Chata Hliněnka', $text, $email);
    send_json(['ok' => true, 'notified' => $notified, 'message' => $notified
        ? 'Poptávka byla přijata. Ozveme se po jejím posouzení.'
        : 'Poptávka je uložená, ale e-mailové upozornění se nepodařilo odeslat. Pro jistotu nás kontaktujte telefonicky.']);
}
if ($action === 'request-code') {
    // Přihlášení jen kódem doručeným provozovateli, žádné veřejné heslo.
    $r = data_store(function(array &$d, bool &$save) {
        if (($d['last_code_at'] ?? 0) > time() - 120) return ['send' => false];
        $code = (string)random_int(100000, 999999);
        $d['otp'] = ['hash' => password_hash($code, PASSWORD_DEFAULT), 'expires' => time() + 600, 'tries' => 0];
        $d['last_code_at'] = time(); $save = true;
        return ['send' => true, 'code' => $code];
    });
    $sent = !$r['send'] || send_mail_text(OWNER_MAIL, 'Přihlašovací kód – Chata Hliněnka',
        "Kód pro správu rezervací: ".$r['code']."\nPlatnost 10 minut.\nPokud jste o kód nežádali, tento e-mail ignorujte.");
    send_json(['ok' => true, 'message' => $sent ? 'Pokud byl kód vyžádán, přijde na e-mail provozovatele.' : 'Nepodařilo se odeslat přihlašovací kód.']);
}
if ($action === 'verify-code') {
    $code = required_text($body['code'] ?? null, 12, 'kód');
    $r = data_store(function(array &$d, bool &$save) use ($code) {
        $otp = $d['otp'] ?? null;
        if (!$otp || ($otp['expires'] ?? 0) < time() || ($otp['tries'] ?? 0) >= 5) return false;
        $d['otp']['tries'] = (int)$otp['tries'] + 1; $save = true;
        if (!password_verify($code, $otp['hash'])) return false;
        $d['otp'] = null;
        return true;
    });
    if (!$r) err('Kód je neplatný nebo vypršel.', 401);
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    send_json(['ok' => true]);
}
if ($action === 'logout') {
    $_SESSION = []; session_destroy(); send_json(['ok' => true]);
}
require_admin();

if ($action === 'decision') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $status = (string)($body['status'] ?? '');
    if (!in_array($status, ['approved', 'rejected'], true)) err('Neznámý stav.');
    $result = data_store(function(array &$d, bool &$save) use ($id, $status) {
        foreach ($d['records'] as &$r) {
            if ($r['id'] !== $id) continue;
            if ($status === 'approved' && overlaps($d['records'], $r['start'], $r['end'], $id)) return ['error' => 'Termín se překrývá s potvrzenou rezervací.'];
            $r['status'] = $status; $r['updatedAt'] = date(DATE_ATOM); $save = true;
            return ['record' => $r];
        }
        return ['error' => 'Rezervace nebyla nalezena.'];
    });
    if (isset($result['error'])) err($result['error'], 409);
    $r = $result['record'];
    $mailSent = true;
    if (!empty($r['email'])) {
        $text = ($status === 'approved' ? "Potvrzujeme váš termín pobytu" : "Bohužel nemůžeme potvrdit vámi poptávaný termín")
            ." na Chatě Hliněnka: ".$r['start']." až ".$r['end'].".\n\nNa podrobnostech se domluvíme e-mailem nebo telefonicky.\nChata Hliněnka";
        $mailSent = send_mail_text($r['email'], $status === 'approved' ? 'Potvrzení pobytu – Chata Hliněnka' : 'Poptávka pobytu – Chata Hliněnka', $text, OWNER_MAIL);
    }
    send_json(['ok' => true, 'notified' => $mailSent]);
}
if ($action === 'block') {
    $start = (string)($body['start'] ?? ''); $end = (string)($body['end'] ?? '');
    check_dates($start, $end);
    $name = required_text($body['name'] ?? null, 120, 'důvod');
    $result = data_store(function(array &$d, bool &$save) use ($start, $end, $name) {
        if (overlaps($d['records'], $start, $end)) return false;
        $d['records'][] = ['id' => bin2hex(random_bytes(12)), 'start' => $start, 'end' => $end,
            'name' => $name, 'status' => 'approved', 'source' => 'Ruční blokace', 'createdAt' => date(DATE_ATOM)];
        $save = true; return true;
    });
    if (!$result) err('Termín je obsazený.', 409);
    send_json(['ok' => true]);
}
if ($action === 'delete') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $r = data_store(function(array &$d, bool &$save) use ($id) {
        $old = count($d['records']);
        $d['records'] = array_values(array_filter($d['records'], fn($r) => ($r['id'] ?? '') !== $id));
        $save = count($d['records']) < $old; return $save;
    });
    if (!$r) err('Záznam nenalezen.', 404);
    send_json(['ok' => true]);
}
if ($action === 'pricing') {
    $newPrices = [];
    foreach (['offShort', 'offWeek', 'extraNight', 'summerShort', 'summerWeek'] as $key) {
        $price = filter_var($body[$key] ?? null, FILTER_VALIDATE_INT);
        if ($price === false || $price < 1 || $price > 250000) err('Zkontrolujte cenu '.$key.'.');
        $newPrices[$key] = $price;
    }
    data_store(function(array &$d, bool &$save) use ($newPrices) {
        $d['pricing'] = $newPrices;
        $save = true;
        return true;
    });
    send_json(['ok' => true]);
}
if ($action === 'import-ical') {
    $ical = (string)($body['ical'] ?? '');
    if (strlen($ical) > 1000000) err('Soubor je příliš velký.');
    preg_match_all('/BEGIN:VEVENT(.*?)END:VEVENT/s', str_replace("\r", '', $ical), $m);
    $events = [];
    foreach (array_slice($m[1] ?? [], 0, 600) as $event) {
        if (!preg_match('/^DTSTART(?:;[^:\n]+)?:([0-9]{8})/m', $event, $s) ||
            !preg_match('/^DTEND(?:;[^:\n]+)?:([0-9]{8})/m', $event, $e)) continue;
        $start = substr($s[1], 0, 4).'-'.substr($s[1], 4, 2).'-'.substr($s[1], 6, 2);
        $end = substr($e[1], 0, 4).'-'.substr($e[1], 4, 2).'-'.substr($e[1], 6, 2);
        if (valid_day($start) && valid_day($end) && $end > $start) $events[] = [$start, $end];
    }
    $counts = data_store(function(array &$d, bool &$save) use ($events) {
        $ok = 0; $skip = 0;
        foreach ($events as [$start, $end]) {
            if (overlaps($d['records'], $start, $end)) { $skip++; continue; }
            $d['records'][] = ['id' => bin2hex(random_bytes(12)), 'start' => $start, 'end' => $end,
                'name' => 'Import z iCal', 'source' => 'iCal', 'status' => 'approved', 'createdAt' => date(DATE_ATOM)];
            $ok++;
        }
        if ($ok) $save = true;
        return ['imported' => $ok, 'skipped' => $skip];
    });
    send_json(['ok' => true] + $counts);
}
err('Neznámá akce.', 404);
