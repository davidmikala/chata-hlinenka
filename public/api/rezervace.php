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
function price_quote(array $d, string $start, string $end): array {
    $p = $d['pricing'] ?? [];
    $base = (int)($p['base'] ?? 0);
    $total = 0; $min = 1; $complete = true;
    $nights = days_between($start, $end);
    for ($i = 0; $i < $nights; $i++) {
        $day = gmdate('Y-m-d', strtotime($start.' 12:00:00 UTC') + $i * 86400);
        $t = ['price' => $base, 'min' => 1];
        foreach ($p['rates'] ?? [] as $rate) {
            if (($rate['start'] ?? '') <= $day && $day < ($rate['end'] ?? '')) $t = $rate;
        }
        $min = max($min, (int)($t['min'] ?? 1));
        $price = (int)($t['price'] ?? 0);
        if ($price <= 0) $complete = false;
        $total += $price;
    }
    return ['nights' => $nights, 'min' => $min, 'total' => $complete ? $total : null];
}
function send_mail_text(string $to, string $subject, string $message, ?string $replyTo = null): bool {
    $headers = ['From: Chata Hlinenka <'.SENDER_MAIL.'>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8'];
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $headers[] = 'Reply-To: '.$replyTo;
    return @mail($to, '=?UTF-8?B?'.base64_encode($subject).'?=', $message, implode("\r\n", $headers));
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
                'pricing' => $d['pricing'] ?? ['base' => 0, 'rates' => []],
            ];
        });
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
        send_json(['ok' => true, 'records' => $d['records'] ?? [], 'pricing' => $d['pricing'] ?? []]);
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
    $base = filter_var($body['base'] ?? null, FILTER_VALIDATE_INT);
    if ($base === false || $base < 0 || $base > 200000) err('Zkontrolujte základní cenu.');
    $rates = $body['rates'] ?? [];
    if (!is_array($rates) || count($rates) > 80) err('Neplatný ceník.');
    $clean = [];
    foreach ($rates as $r) {
        if (!is_array($r)) err('Neplatná cenová položka.');
        $start = (string)($r['start'] ?? ''); $end = (string)($r['end'] ?? '');
        if (!valid_day($start) || !valid_day($end) || $end <= $start) err('Chybný termín ceníku.');
        $price = filter_var($r['price'] ?? null, FILTER_VALIDATE_INT);
        $min = filter_var($r['min'] ?? null, FILTER_VALIDATE_INT);
        if ($price === false || $price < 0 || $price > 200000 || $min === false || $min < 1 || $min > 30) err('Neplatná cena nebo minimální počet nocí.');
        $clean[] = ['name' => required_text($r['name'] ?? null, 100, 'období'), 'start' => $start, 'end' => $end, 'price' => $price, 'min' => $min];
    }
    data_store(function(array &$d, bool &$save) use ($base, $clean) {
        $d['pricing'] = ['base' => $base, 'rates' => $clean]; $save = true; return true;
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
