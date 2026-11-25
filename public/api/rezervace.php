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

// Serverové PDF faktury, osobní údaje neopouštějí hosting.
define('HLINENKA_PDF_INTERNAL', true);
require_once __DIR__.'/invoice-pdf.php';

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
        // Jednorázové doplnění schválené identity ubytovatele a banky
        // do soukromého úložiště; již vystavené doklady se nemění.
        // DPH zůstává beze změny, do první volby jej nepředpokládáme.
        if ((int)($d['billingIdentityRevision'] ?? 0) < 1) {
            $billing = is_array($d['billingSettings'] ?? null) ? $d['billingSettings'] : [];
            foreach ([
                'sellerName' => 'David Mikala',
                'sellerAddress' => "Míškovice 177\n768 52 Míškovice",
                'sellerId' => '74743881',
                'bankAccount' => '6052704445/6363',
                'iban' => 'CZ6363630000006052704445',
            ] as $key => $value) {
                $billing[$key] = $value;
            }
            $d['billingSettings'] = $billing;
            $d['billingIdentityRevision'] = 1;
            $save = true;
        }
        // Provozovatel David Mikala (IČO 74743881) výslovně potvrdil,
        // že není plátcem DPH. Uložit tuto volbu jednorázově, aby se
        // promítla i do existujícího soukromého nastavení na hostingu.
        // Novější ruční změny v administraci pak už tato migrace nemění.
        if ((int)($d['billingVatRevision'] ?? 0) < 1) {
            $billing = is_array($d['billingSettings'] ?? null) ? $d['billingSettings'] : [];
            $billing['vatMode'] = 'nonvat';
            $d['billingSettings'] = $billing;
            $d['billingVatRevision'] = 1;
            $save = true;
        }
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
// iCal synchronizace e-chalupy Profi. Cizi rezervace uchovavame oddelene
// od vlastnich rezervaci, nevystavujeme k nim faktury a neexportujeme je zpet.
function echalupy_feed_url(string $input): ?string {
    $url = trim($input);
    if ($url === '' || strlen($url) > 2000 || preg_match('/[\x00-\x20]/', $url)) return null;
    $parts = parse_url($url);
    if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
        || isset($parts['user']) || isset($parts['pass'])
        || isset($parts['port']) || isset($parts['fragment'])) return null;
    $host = strtolower((string)($parts['host'] ?? ''));
    // Jen domena e-chalupy.cz a jeji subdomeny, nikdy libovolna externa URL.
    if ($host !== 'e-chalupy.cz' && !str_ends_with($host, '.e-chalupy.cz')) return null;
    return $url;
}
function echalupy_parse_ical(string $raw): ?array {
    if (!str_contains($raw, 'BEGIN:VCALENDAR') || !str_contains($raw, 'END:VCALENDAR')) return null;
    $raw = preg_replace("/\r\n[ \t]|\n[ \t]/", '', str_replace("\r\n", "\n", $raw));
    preg_match_all('/BEGIN:VEVENT\s*\n(.*?)\nEND:VEVENT/s', $raw, $matches);
    $events = [];
    foreach (array_slice($matches[1] ?? [], 0, 1500) as $body) {
        if (preg_match('/^STATUS:CANCELLED\s*$/mi', $body) || preg_match('/^TRANSP:TRANSPARENT\s*$/mi', $body)) continue;
        if (preg_match('/^UID:(.*)$/mi', $body, $uid) &&
            str_contains(strtolower(trim($uid[1])), '@chatahlinenka.cz')) continue;
        // Celodenni obsazenost i datum-cas; odjezd je podle iCalendar vylucny.
        if (!preg_match('/^DTSTART(?:;[^:\n]+)?:([0-9]{8})/mi', $body, $start)
            || !preg_match('/^DTEND(?:;[^:\n]+)?:([0-9]{8})/mi', $body, $end)) continue;
        $a = substr($start[1], 0, 4).'-'.substr($start[1], 4, 2).'-'.substr($start[1], 6, 2);
        $b = substr($end[1], 0, 4).'-'.substr($end[1], 4, 2).'-'.substr($end[1], 6, 2);
        if (!valid_day($a) || !valid_day($b) || $a >= $b) continue;
        // Pouze data: nikdy neprenasej jmena hostu z externiho feedu.
        $events[$a.'|'.$b] = ['start'=>$a,'end'=>$b];
    }
    return array_values($events);
}
function echalupy_refresh(bool $force = false): array {
    $settings = data_store(static function(array &$d, bool &$save): array {
        return [
            'url' => (string)($d['echalupyUrl'] ?? ''),
            'lastAttempt' => (int)($d['echalupyLastAttempt'] ?? 0),
            'count' => count($d['echalupyOccupied'] ?? []),
            'lastOk' => (int)($d['echalupyLastOk'] ?? 0),
            'error' => (string)($d['echalupyError'] ?? '')
        ];
    });
    if ($settings['url'] === '') return ['enabled'=>false, 'count'=>0];
    // Nespoustej sit pri kazde navsteve; maximalne 1 pokus za 10 min.
    if (!$force && $settings['lastAttempt'] > time() - 600) {
        return ['enabled'=>true, 'count'=>$settings['count'],
            'lastOk'=>$settings['lastOk'],'error'=>$settings['error']];
    }
    data_store(static function(array &$d, bool &$save): void {
        $d['echalupyLastAttempt'] = time(); $save = true;
    });
    $url = echalupy_feed_url($settings['url']);
    if (!$url) return ['enabled'=>true, 'count'=>$settings['count'],
        'error'=>'Neplatná adresa externího kalendáře.'];
    $context = stream_context_create([
        'http'=>['method'=>'GET', 'timeout'=>7, 'follow_location'=>0,
            'header'=>"User-Agent: ChataHlinenka-iCal/1.0\r\nAccept: text/calendar\r\n"],
        'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true],
    ]);
    $handle = @fopen($url, 'rb', false, $context);
    $raw = $handle ? stream_get_contents($handle, 1000001) : false;
    if ($handle) fclose($handle);
    $events = is_string($raw) && strlen($raw) <= 1000000 ? echalupy_parse_ical($raw) : null;
    if ($events !== null) {
        $result = data_store(static function(array &$d, bool &$save) use ($url, $events): array {
            if (($d['echalupyUrl'] ?? '') !== $url) return ['enabled'=>false, 'count'=>0];
            $d['echalupyOccupied'] = $events;
            $d['echalupyLastOk'] = time();
            $d['echalupyError'] = '';
            $save = true;
            return ['enabled'=>true,'count'=>count($events),'lastOk'=>time(),'error'=>''];
        });
        return $result;
    }
    data_store(static function(array &$d, bool &$save): void {
        $d['echalupyError'] = 'Kalendář se nepodařilo načíst. Používá se poslední úspěšná synchronizace.';
        $save = true;
    });
    return ['enabled'=>true, 'count'=>$settings['count'], 'lastOk'=>$settings['lastOk'],
        'error'=>'Kalendář se nepodařilo načíst. Používá se poslední úspěšná synchronizace.'];
}
function echalupy_conflict(array $d, string $start, string $end): bool {
    foreach ($d['echalupyOccupied'] ?? [] as $row) {
        if ($start < ($row['end'] ?? '') && $end > ($row['start'] ?? '')) {
            // Zpetny import vlastni rezervace e-chalupy muze mit jine UID:
            // shodny interval s jiz potvrzenou vlastni rezervaci ignorujeme.
            $own = false;
            foreach ($d['records'] ?? [] as $r) {
                if (($r['status'] ?? '') === 'approved'
                    && ($r['start'] ?? '') === ($row['start'] ?? '')
                    && ($r['end'] ?? '') === ($row['end'] ?? '')) {$own = true; break;}
            }
            if (!$own) return true;
        }
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
    // Silvestr 2026/2027: libovolny pobyt 1 az 5 noci v intervalu, stejna celkova cena.
    if ($start >= '2026-12-29' && $end <= '2027-01-03' && $nights >= 1 && $nights <= 5) {
        return ['nights' => $nights, 'min' => 1, 'total' => 40000,
            'label' => 'Silvestr 2026/2027 · pevná cena', 'type' => 'newyear2026'];
    }
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

function smtp_send_text(array $cfg, string $to, string $subject, string $body, ?string $replyTo, ?string $mimeContentType = null): bool {
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
            'Content-Type: '.($mimeContentType ?? 'text/plain; charset=UTF-8'),
        ];
        if ($mimeContentType === null) {
            $headers[] = 'Content-Transfer-Encoding: 8bit';
        }
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers[] = 'Reply-To: <'.$replyTo.'>';
        }
        $normalized = str_replace(["\r\n", "\r"], "\n", $body);
        $normalized = implode("\r\n", array_map(
            static fn(string $line): string => str_starts_with($line, '.') ? '.'.$line : $line,
            explode("\n", $normalized)
        ));
        $payload = implode("\r\n", $headers)."\r\n\r\n".$normalized."\r\n.\r\n";
        // Dlouha HTML zprava s vlozenymi obrazky muze presahovat velikost jednoho fwrite().
        $written = 0;
        $length = strlen($payload);
        while ($written < $length) {
            $chunk = substr($payload, $written, 16384);
            $bytes = fwrite($connection, $chunk);
            if ($bytes === false || $bytes === 0) {
                throw new RuntimeException('SMTP zprava nebyla cela zapsana');
            }
            $written += $bytes;
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
// Automaticka odpoved zakaznikovi po odeslani nezavazne poptavky.
// Obrazky jsou dodane majitelem Chaty Hlinenka, nikoli AI generovane.
// Vlozene jako CID (multipart/related), aby se zobrazovaly i bez nacteni externeho obsahu.
function send_mail_html_inline(
    string $to,
    string $subject,
    string $plain,
    string $html,
    array $images,
    ?string $replyTo = null
): bool {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) ||
        ($replyTo !== null && !filter_var($replyTo, FILTER_VALIDATE_EMAIL))) return false;

    // Pokud chybi obrazek na hostingu, poslat alespon textovy e-mail, aby host vedel o prijeti.
    foreach ($images as $img) {
        if (!is_file($img['path']) || !is_readable($img['path'])) {
            error_log('Hlinenka: chybi verejny obrazek potvrzeni poptavky');
            return send_mail_text($to, $subject, $plain, $replyTo);
        }
    }

    $related = 'hlinenka_related_'.bin2hex(random_bytes(12));
    $alternative = 'hlinenka_alt_'.bin2hex(random_bytes(12));
    $body = '--'.$related."\r\n"
        .'Content-Type: multipart/alternative; boundary="'.$alternative.'"'."\r\n\r\n"
        .'--'.$alternative."\r\n"
        ."Content-Type: text/plain; charset=UTF-8\r\n"
        ."Content-Transfer-Encoding: base64\r\n\r\n"
        .chunk_split(base64_encode($plain), 76, "\r\n")
        .'--'.$alternative."\r\n"
        ."Content-Type: text/html; charset=UTF-8\r\n"
        ."Content-Transfer-Encoding: base64\r\n\r\n"
        .chunk_split(base64_encode($html), 76, "\r\n")
        .'--'.$alternative."--\r\n";
    foreach ($images as $img) {
        $bytes = @file_get_contents($img['path']);
        if ($bytes === false) {
            error_log('Hlinenka: nelze precist obrazek potvrzeni poptavky');
            return send_mail_text($to, $subject, $plain, $replyTo);
        }
        $body .= '--'.$related."\r\n"
            .'Content-Type: image/jpeg; name="'.$img['name'].'"'."\r\n"
            ."Content-Transfer-Encoding: base64\r\n"
            .'Content-ID: <'.$img['cid'].'>'."\r\n"
            .'Content-Disposition: inline; filename="'.$img['name'].'"'."\r\n\r\n"
            .chunk_split(base64_encode($bytes), 76, "\r\n");
    }
    $body .= '--'.$related."--\r\n";
    $mimeContentType = 'multipart/related; boundary="'.$related.'"';
    $smtp = smtp_settings();
    if ($smtp !== null) {
        // Jeden pokus pres SMTP. Po chybe neodesilat duplicitne jinou cestou.
        return smtp_send_text($smtp, $to, $subject, $body, $replyTo, $mimeContentType);
    }
    $headers = [
        'From: Chata Hlinenka <'.SENDER_MAIL.'>',
        'MIME-Version: 1.0',
        'Content-Type: '.$mimeContentType,
    ];
    if ($replyTo) $headers[] = 'Reply-To: <'.$replyTo.'>';
    $accepted = @mail($to, '=?UTF-8?B?'.base64_encode($subject).'?=', $body, implode("\r\n", $headers));
    if (!$accepted) error_log('Hlinenka: PHP mail() neprevzal automatickou odpoved hostovi');
    return $accepted;
}

function send_guest_inquiry_receipt(array $r): bool {
    $name = (string)($r['name'] ?? '');
    $email = (string)($r['email'] ?? '');
    $start = (string)($r['start'] ?? '');
    $end = (string)($r['end'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !valid_day($start) || !valid_day($end)) return false;

    $startFormatted = (new DateTimeImmutable($start))->format('j. n. Y');
    $endFormatted = (new DateTimeImmutable($end))->format('j. n. Y');
    $dates = $startFormatted.' – '.$endFormatted;
    $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeDates = htmlspecialchars($dates, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    $subject = 'Přijali jsme vaši poptávku – Chata Hliněnka';
    $plain = "Vaši poptávku jsme úspěšně přijali\n\n"
        ."Dobrý den,\n\n"
        ."Moc nás těší váš zájem o pobyt na Chatě Hliněnka. Vaše poptávka k nám v pořádku dorazila.\n\n"
        ."Požadovaný termín: ".$dates."\n"
        ."Stav: Poptávka čeká na potvrzení.\n\n"
        ."Jakmile ověříme dostupnost termínu, pošleme vám samostatný e-mail s potvrzením rezervace "
        ."nebo se s vámi spojíme kvůli dalším podrobnostem.\n\n"
        ."Odesláním poptávky ještě nevzniká závazná rezervace ani automatická blokace termínu.\n\n"
        ."Pokud budete mít jakýkoliv dotaz, neváhejte se nám ozvat.\n\n"
        ."Těšíme se na vás!\n\n"
        ."David Mikala\nChata Hliněnka\n"
        ."+420 605 270 444\n"
        ."david@mikala.cz\n"
        ."www.chatahlinenka.cz";

    $html = <<<HTML
<!doctype html>
<html lang="cs">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3eee6;font-family:Arial,Helvetica,sans-serif;color:#203c2b;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3eee6;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;background:#fffcf7;border-radius:18px;overflow:hidden;">
    <tr><td>
      <img src="cid:chata-photo@chatahlinenka.cz" alt="Chata Hliněnka v Hostýnských vrších" width="620"
        style="display:block;width:100%;height:auto;border:0;">
    </td></tr>
    <tr><td align="center" style="padding:22px 25px 0;">
      <img src="cid:chata-logo@chatahlinenka.cz" alt="Logo Chaty Hliněnka" width="106" height="106"
        style="display:block;width:106px;height:106px;border-radius:53px;border:2px solid #1d422c;">
    </td></tr>
    <tr><td align="center" style="padding:10px 28px 20px;">
      <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;color:#183e2a;font-size:32px;line-height:1.15;font-weight:normal;">Vaši poptávku jsme přijali</h1>
      <p style="margin:12px 0 0;color:#5d6a5f;font-size:15px;line-height:1.6;">
        Děkujeme, že jste si pro svůj pobyt vybrali Chatu Hliněnka.
      </p>
    </td></tr>
    <tr><td style="padding:0 30px 20px;">
      <p style="font-size:15px;line-height:1.75;margin:0 0 12px;">Dobrý den,</p>
      <p style="font-size:15px;line-height:1.75;margin:0 0 16px;">
        moc nás těší váš zájem o pobyt na naší chatě. <strong>Vaše poptávka k nám v pořádku dorazila</strong> a budeme se jí věnovat.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#efead8;border-radius:12px;">
        <tr><td style="padding:18px 20px;">
          <span style="font-size:12px;color:#607164;letter-spacing:1px;">POŽADOVANÝ TERMÍN POBYTU</span>
          <div style="font-size:22px;line-height:1.35;color:#153b28;font-family:Georgia,'Times New Roman',serif;font-weight:bold;margin-top:6px;">{$safeDates}</div>
        </td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:14px;background:#fff3de;border:1px solid #edcf95;border-radius:10px;">
        <tr><td style="padding:15px 18px;">
          <strong style="font-size:16px;color:#705124;">Poptávka čeká na potvrzení</strong>
          <p style="font-size:14px;line-height:1.6;color:#604f35;margin:6px 0 0;">
            Termín zatím není závazně rezervován ani blokován. Po ověření dostupnosti vám zašleme samostatné potvrzení rezervace.
          </p>
        </td></tr>
      </table>
      <p style="font-size:15px;line-height:1.75;margin:18px 0 12px;">
        Pokud bude potřeba něco upřesnit, ozveme se e-mailem nebo telefonicky. A kdybyste měli otázky vy, jsme tu pro vás.
      </p>
      <p style="font-size:15px;line-height:1.7;margin:22px 0 0;">
        Těšíme se na vás!<br>
        <strong>David Mikala</strong><br>
        Chata Hliněnka
      </p>
    </td></tr>
    <tr><td style="padding:24px 20px;background:#113923;text-align:center;color:#f8f3e8;font-size:13px;line-height:1.9;">
      <a href="tel:+420605270444" style="color:#f8f3e8;text-decoration:none;">+420 605 270 444</a>
      &nbsp; · &nbsp;
      <a href="mailto:david@mikala.cz" style="color:#f8f3e8;text-decoration:none;">david@mikala.cz</a><br>
      <a href="https://www.chatahlinenka.cz" style="color:#f8f3e8;text-decoration:underline;">www.chatahlinenka.cz</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>
HTML;
    $base = dirname(__DIR__).'/email';
    $images = [
        ['path' => $base.'/chata-hlinenka-foto-09.jpg', 'cid' => 'chata-photo@chatahlinenka.cz',
         'name' => 'chata-hlinenka.jpg'],
        ['path' => $base.'/logo-hlinenka-prirodni.jpg', 'cid' => 'chata-logo@chatahlinenka.cz',
         'name' => 'logo-chata-hlinenka.jpg'],
    ];
    return send_mail_html_inline($email, $subject, $plain, $html, $images, OWNER_MAIL);
}


/**
 * Fakturace Chaty Hlinenka; doklady a cisleni jsou ulozeny v zamcenem
 * soukromem JSON u rezervaci, nikoli ve verejnem webovem adresari.
 * V rezimu platce DPH je vystavovani schvalne pozastaveno, dokud neni
 * implementovano a overeno prislusne DPH / danove doklady k platbam.
 */
function billing_settings(array $d): array {
    $current = $d['billingSettings'] ?? [];
    if (!is_array($current)) $current = [];
    // Ubytovatel potvrdil fakturační údaje i režim neplátce DPH.
    // Platný IBAN je odvozen z 6052704445/6363.
    // Existující vyplněná soukromá nastavení mají přednost.
    $defaults = [
        'sellerName' => 'David Mikala',
        'sellerAddress' => "Míškovice 177\n768 52 Míškovice",
        'sellerId' => '74743881',
        'sellerVatId' => '',
        'vatMode' => 'nonvat',
        'iban' => 'CZ6363630000006052704445',
        'bankAccount' => '6052704445/6363',
    ];
    $settings = array_intersect_key($current, $defaults);
    foreach ($defaults as $key => $default) {
        if (!isset($settings[$key]) || trim((string)$settings[$key]) === '') {
            $settings[$key] = $default;
        }
    }
    return $settings;
}
function billing_ready(array $settings): bool {
    return trim((string)$settings['sellerName']) !== ''
        && trim((string)$settings['sellerAddress']) !== ''
        && preg_match('/^[0-9]{8}$/D', (string)$settings['sellerId']) === 1
        && $settings['vatMode'] === 'nonvat'
        && valid_cz_iban((string)$settings['iban']);
}
function valid_cz_iban(string $iban): bool {
    if (preg_match('/^CZ[0-9]{22}$/D', $iban) !== 1) return false;
    $rearranged = substr($iban, 4).'1235'.substr($iban, 2, 2);
    $mod = 0;
    foreach (str_split($rearranged) as $digit) $mod = ($mod * 10 + (int)$digit) % 97;
    return $mod === 1;
}
function private_documents(array $d): array {
    return array_values($d['invoices'] ?? []);
}
function document_number(array &$d, string $type): string {
    $prefixes = ['deposit' => 'Z', 'balance' => 'D', 'final' => 'F', 'full' => 'F'];
    if (!isset($prefixes[$type])) throw new LogicException('Neplatny druh dokladu');
    $year = date('Y');
    $key = $year.'-'.($type === 'full' ? 'final' : $type);
    $d['invoiceSequences'] ??= [];
    $seq = (int)($d['invoiceSequences'][$key] ?? 0) + 1;
    $d['invoiceSequences'][$key] = $seq;
    return $prefixes[$type].$year.'-'.str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
}
function create_invoice(array &$d, array $r, string $type, int $amountDue): array {
    $settings = billing_settings($d);
    if (!billing_ready($settings)) throw new LogicException('Neúplné fakturační údaje.');
    $invoice = [
        'id' => bin2hex(random_bytes(12)),
        'token' => bin2hex(random_bytes(24)),
        'reservationId' => $r['id'],
        'type' => $type,
        'number' => document_number($d, $type),
        'issued' => date('Y-m-d'),
        'due' => $type === 'deposit' ? date('Y-m-d', strtotime('+5 days'))
             : ($type === 'full' ? date('Y-m-d') : null),
        'status' => $type === 'final' ? 'paid' : 'issued',
        'amount' => $amountDue,
        'total' => (int)$r['price'],
        'depositPaid' => (int)($r['depositAmountPaid'] ?? 0),
        'dateStart' => $r['start'],
        'dateEnd' => $r['end'],
        'customerName' => $r['billingName'] ?? $r['name'],
        'customerAddress' => $r['billingAddress'] ?? '',
        'customerEmail' => $r['email'] ?? '',
        'variableSymbol' => $r['paymentVs'] ?? '',
        'seller' => $settings,
    ];
    $d['invoices'] ??= [];
    $d['invoices'][] = $invoice;
    return $invoice;
}
function invoice_public_link(array $invoice): string {
    return 'https://www.chatahlinenka.cz/api/rezervace.php?action=invoice-view&token='.$invoice['token'];
}
function invoice_record(array $d, string $reservationId, string $type): ?array {
    foreach ($d['invoices'] ?? [] as $invoice) {
        if (($invoice['reservationId'] ?? '') === $reservationId && ($invoice['type'] ?? '') === $type) return $invoice;
    }
    return null;
}
function money_cz(int $amount): string { return number_format($amount, 0, ',', ' ').' Kč'; }
function date_cz(string $day): string { return (new DateTimeImmutable($day))->format('j. n. Y'); }
function htmlsafe(string $text): string { return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function invoice_html(array $inv): string {
    // Schválený pevný vzhled A – Přírodní elegance. Stejný motiv pro všechny doklady.
    // Údaje vystavovatele jsou výhradně uložený snímek skutečného ubytovatele,
    // nikdy automaticky fakturační údaje společnosti MIKALA.
    $kind = (string)($inv['type'] ?? '');
    $final = $kind === 'final';
    $titles = [
        'deposit' => 'ZÁLOHOVÁ FAKTURA',
        'balance' => 'VÝZVA K DOPLATKU',
        'full' => 'FAKTURA ZA POBYT',
        'final' => 'ZÚČTOVACÍ FAKTURA',
    ];
    $overviews = [
        'deposit' => '01 / PLATEBNÍ VÝZVA',
        'balance' => '02 / PLATEBNÍ VÝZVA',
        'full' => 'PLATBA 100 % / POBYT NA POSLEDNÍ CHVÍLI',
        'final' => '03 / KONEČNÉ VYÚČTOVÁNÍ',
    ];
    $title = $titles[$kind] ?? 'DOKLAD';
    $overview = $overviews[$kind] ?? '';
    $seller = $inv['seller'];
    $sellerHtml = htmlsafe((string)$seller['sellerName']);
    $sellerAddress = nl2br(htmlsafe((string)$seller['sellerAddress']));
    $ico = htmlsafe((string)$seller['sellerId']);
    $vatLine = ($seller['vatMode'] ?? '') === 'nonvat' ? '<br>Nejsme plátci DPH.' : '';
    $no = htmlsafe((string)$inv['number']);
    $customer = htmlsafe((string)$inv['customerName']);
    $customerAddress = nl2br(htmlsafe((string)$inv['customerAddress']));
    $issued = date_cz((string)$inv['issued']);
    $stay = date_cz((string)$inv['dateStart']).' – '.date_cz((string)$inv['dateEnd']);
    $nights = days_between((string)$inv['dateStart'], (string)$inv['dateEnd']);
    $status = (string)($inv['status'] ?? 'issued');
    $statusLabel = $status === 'cancelled' ? 'ZRUŠENO' : ($status === 'paid' ? 'UHRAZENO' : 'K ÚHRADĚ');
    $due = $inv['due'] ? date_cz((string)$inv['due']) : 'Podle platebních pokynů';
    $amountDue = (int)$inv['amount'];
    $amount = money_cz($amountDue);
    $total = money_cz((int)$inv['total']);
    $depositPaid = (int)$inv['depositPaid'];
    $paid = money_cz($depositPaid);
    $balancePaid = money_cz(max(0, (int)$inv['total'] - $depositPaid));
    $account = htmlsafe((string)($seller['bankAccount'] ?: $seller['iban']));
    $iban = htmlsafe((string)$seller['iban']);
    $vs = htmlsafe((string)$inv['variableSymbol']);
    $qrString = '';
    if ($amountDue > 0 && $status === 'issued') {
        // Lokální QR platba SPAYD: skutečný IBAN a VS z fakturačního nastavení.
        $qrString = 'SPD*1.0*ACC:'.$seller['iban'].'*AM:'.number_format($amountDue, 2, '.', '')
            .'*CC:CZK*X-VS:'.$inv['variableSymbol'];
    }
    $jsonQr = json_encode($qrString, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $dueRow = $final
        ? '<div class="line"><span>Stav platby</span><span>Uhrazeno</span></div>'
        : '<div class="line"><span>Splatnost</span><span>'.htmlsafe($due).'</span></div>';
    $amountLabel = $final ? 'Zbývá k úhradě' : 'Částka k úhradě';
    $rows = '<tr><td>Ubytování – Chata Hliněnka<br><span class="minor">'.$stay.' · '.$nights.' nocí</span></td><td>'.$total.'</td></tr>';
    if ($final) {
        $rows .= '<tr><td>Uhrazená záloha</td><td>− '.$paid.'</td></tr>';
        $rows .= '<tr><td>Uhrazený doplatek</td><td>− '.$balancePaid.'</td></tr>';
    } elseif ($kind === 'deposit') {
        $rows .= '<tr><td>Záloha na rezervaci (50 %)</td><td><strong>'.$amount.'</strong></td></tr>';
    } elseif ($kind === 'full') {
        $rows .= '<tr><td>Jednorázová platba 100 %</td><td><strong>'.$amount.'</strong></td></tr>';
    } else {
        $rows .= '<tr><td>Uhrazená záloha</td><td>− '.$paid.'</td></tr>';
        $rows .= '<tr><td>Doplatek ceny pobytu</td><td><strong>'.$amount.'</strong></td></tr>';
    }
    if ($final) {
        $payment = '<div><div class="smallhead">Přehled úhrad</div><p>'
            .'Záloha: <strong>'.$paid.'</strong> · uhrazeno<br>'
            .'Doplatek: <strong>'.$balancePaid.'</strong> · uhrazeno<br>'
            .'Celkem zaplaceno: <strong>'.$total.'</strong><br>'
            .'Variabilní symbol: <strong>'.$vs.'</strong></p></div>'
            .'<div class="paid-mark">PLNĚ UHRAZENO</div>';
    } else {
        $dueDetail = $kind === 'deposit' ? '<br>Splatnost: <strong>'.htmlsafe($due).'</strong>' : '';
        $payment = '<div><div class="smallhead">Platební údaje</div><p>'
            .'Číslo účtu: <strong>'.$account.'</strong><br>'
            .'IBAN: '.$iban.'<br>'
            .'Variabilní symbol: <strong>'.$vs.'</strong>'.$dueDetail.'</p></div>'
            .($qrString !== '' ? '<div class="qrbox"><div id="payment-qr"></div><small>QR platba · naskenujte v bankovní aplikaci</small></div>' : '');
    }
    $note = $status === 'cancelled'
        ? '<strong>Doklad byl zrušen – neprovádějte podle něj žádnou platbu.</strong>'
        : ($kind === 'deposit'
            ? 'Zálohová faktura je výzvou k platbě (proforma), sama není daňovým dokladem. Po přijetí zálohy pobyt písemně potvrdíme.'
            : ($kind === 'balance'
                ? 'Výzva k úhradě doplatku není daňovým dokladem. Doplatek se hradí podle potvrzené rezervace.'
                : ($kind === 'full'
                    ? 'Faktura na celou cenu pobytu při rezervaci na poslední chvíli. Rezervace bude potvrzena po připsání celé úhrady.'
                    : 'Vyúčtování již uhrazeného pobytu. Zbývající částka k úhradě je 0 Kč.')));
    $note .= ' Vratná kauce 5 000 Kč a spotřeba elektrické energie za 7 Kč/kWh se účtují samostatně a nejsou součástí ceny ubytování.';
    $qrScript = $qrString === '' ? '' : <<<SCRIPT
<script src="/js/qrcode.min.js"></script>
<script>(function(){var v={$jsonQr},el=document.getElementById('payment-qr');if(v&&el&&typeof QRCode!=='undefined'){new QRCode(el,{text:v,width:145,height:145,correctLevel:QRCode.CorrectLevel.M});}})();</script>
SCRIPT;

    return <<<HTML
<!doctype html>
<html lang="cs"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>{$no} | Chata Hliněnka</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;background:#e9eee8;color:#193628;font:15px/1.45 Arial,Helvetica,sans-serif}
.invoice-toolbar{text-align:center;padding:16px}
.invoice-toolbar button{background:#1D4632;color:#fff;padding:11px 20px;border:0;border-radius:5px;cursor:pointer;font-weight:700}
.paper{--color:#1D4632;--gold:#B68B4B;--muted:#728276;--light:#E9EDE3;max-width:210mm;min-height:297mm;position:relative;overflow:hidden;margin:0 auto 18px;padding:15mm 19mm 23mm;background:#fffdf8;box-shadow:0 12px 36px #19362820}
.topline{position:absolute;top:0;left:0;right:0;background:#1D4632;height:13mm}
.head{display:flex;align-items:center;gap:15px;margin:4mm 0 3mm;padding-bottom:4mm;border-bottom:2px solid #B68B4B}
.logo{width:67px;height:67px;object-fit:cover;border-radius:50%;flex:none}
.brand{font:700 30px/1.05 Georgia,'Times New Roman',serif;color:#1D4632;white-space:nowrap}
.contact{font-size:12px;line-height:1.5;color:var(--muted)}
.top-right{margin-left:auto;text-align:right;color:var(--gold);font-size:14px;letter-spacing:1.5px;font-weight:700}
.top-right span{font-size:12px;color:var(--muted);letter-spacing:0;font-weight:400}
.title-area{margin:0 0 4mm}
.overview{color:var(--muted);font-size:12px;letter-spacing:1.5px;text-transform:uppercase}
.big-title{font:700 42px/1.09 Georgia,'Times New Roman',serif;color:var(--color);margin:2px 0 0}
.doc-meta{display:flex;gap:13px;align-items:center;margin-top:5mm;font-size:15px}
.status{display:inline-block;background:#ECF0E8;color:#1D4632;padding:6px 11px;border-radius:4px;font-weight:700;font-size:12px;letter-spacing:.6px}
.status--cancelled{background:#fae8e2;color:#883e2a}
.parties{display:flex;gap:12mm;background:#F7F4E9;padding:5mm 9mm;border-radius:6px;margin-bottom:4mm}
.parties>div{width:50%}
.smallhead{color:var(--muted);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.3px;margin-bottom:2mm}
.person{font-size:15px;line-height:1.5;overflow-wrap:anywhere}
.data{margin-bottom:4mm}
.details{display:table;width:100%;border-collapse:collapse}
.details .line{display:table-row}
.details .line span{display:table-cell;padding:7px 0;border-bottom:1px solid var(--light);font-size:14px}
.details .line span:last-child{text-align:right;font-weight:700}
.items{margin-bottom:3mm}
.product-table{width:100%;border-collapse:collapse;font-size:14px}
.product-table th{text-align:left;padding:10px;text-transform:uppercase;letter-spacing:1px;font-size:12px;background:#EFF0E8;color:var(--color)}
.product-table td{padding:8px 10px;border-bottom:1px solid var(--light)}
.product-table td:last-child,.product-table th:last-child{text-align:right;white-space:nowrap}
.minor{color:var(--muted);font-size:12px}
.totalbox{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:12px 16px;background:var(--color);color:#fff;border-radius:5px;margin:5mm 0}
.totalbox label{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}
.totalbox strong{font-size:34px;letter-spacing:-1px;white-space:nowrap}
.payment{display:flex;gap:8mm;align-items:center;justify-content:space-between;margin-bottom:3mm}
.payment p{margin:3mm 0;line-height:1.4}
.qrbox{width:39mm;flex:none;text-align:center}
#payment-qr{display:flex;justify-content:center;align-items:center}
#payment-qr img,#payment-qr canvas{max-width:35mm;width:35mm;height:35mm;image-rendering:pixelated}
.qrbox small{display:block;font-size:10px;line-height:1.25;color:var(--muted);margin-top:2mm}
.paid-mark{border:3px solid #2D674B;color:#2D674B;border-radius:6px;padding:13px;text-align:center;font-size:19px;font-weight:700}
.note{font-size:12px;color:var(--muted);line-height:1.4;margin:0}
.footer{position:absolute;bottom:8mm;left:19mm;right:19mm;border-top:1px solid var(--light);padding-top:4mm;display:flex;justify-content:space-between;gap:16px;color:var(--muted);font-size:11px}
@media screen and (max-width:780px){
 .paper{min-height:0;padding:44px 18px 68px}
 .topline{height:18px}
 .head{flex-wrap:wrap}
 .brand{font-size:24px;white-space:normal}
 .top-right{font-size:12px}
 .big-title{font-size:clamp(27px,7vw,42px)}
 .parties{gap:15px;padding:16px}
 .details .line span{font-size:13px}
 .totalbox strong{font-size:29px}
 .footer{left:18px;right:18px;bottom:15px;font-size:10px}
}
@media screen and (max-width:500px){
 .head{gap:10px}
 .logo{width:50px;height:50px}
 .top-right{width:100%;margin:0;text-align:left}
 .parties{flex-direction:column;gap:12px}
 .parties>div{width:100%}
 .payment{align-items:flex-start;flex-direction:column}
 .totalbox strong{font-size:25px}
 .footer{flex-direction:column;gap:3px}
}
@media print{
 html,body{width:210mm;height:auto;background:#fff}
 .invoice-toolbar{display:none}
 .paper{width:210mm;max-width:none;min-height:297mm;height:297mm;margin:0;padding:15mm 19mm 23mm;box-shadow:none;break-after:page;page-break-after:always}
 .head{flex-wrap:nowrap}
 .brand{font-size:30px;white-space:nowrap}
 .top-right{width:auto;margin-left:auto;text-align:right}
 .parties{flex-direction:row}
 .parties>div{width:50%}
 .payment{flex-direction:row;align-items:center}
 .big-title{font-size:42px}
 .footer{left:19mm;right:19mm;bottom:8mm;font-size:11px;flex-direction:row}
}
</style></head><body>
<div class="invoice-toolbar"><button type="button" onclick="window.print()">Vytisknout / Uložit jako PDF</button></div>
<main class="paper">
  <div class="topline"></div>
  <header class="head">
    <img class="logo" src="/email/logo-hlinenka-prirodni.jpg" alt="Logo Chaty Hliněnka">
    <div><div class="brand">Chata Hliněnka</div><div class="contact">Hlinsko pod Hostýnem · www.chatahlinenka.cz</div></div>
    <div class="top-right">HOSTÝNSKÉ VRCHY<br><span>ubytování v přírodě</span></div>
  </header>
  <section class="title-area">
    <div class="overview">{$overview}</div>
    <h1 class="big-title">{$title}</h1>
    <div class="doc-meta"><strong>č. {$no}</strong> <span class="status">{$statusLabel}</span></div>
  </section>
  <div class="parties">
    <div><div class="smallhead">Dodavatel</div><div class="person"><b>{$sellerHtml} · Chata Hliněnka</b><br>{$sellerAddress}<br>IČO: {$ico}{$vatLine}<br>www.chatahlinenka.cz</div></div>
    <div><div class="smallhead">Odběratel</div><div class="person"><b>{$customer}</b><br>{$customerAddress}<br>Termín: {$stay}</div></div>
  </div>
  <div class="data"><div class="details">
    <div class="line"><span>Datum vystavení</span><span>{$issued}</span></div>
    {$dueRow}
    <div class="line"><span>Místo pobytu</span><span>Chata Hliněnka, Hlinsko pod Hostýnem</span></div>
  </div></div>
  <section class="items"><div class="smallhead">Položky a vyúčtování</div>
    <table class="product-table"><thead><tr><th>Popis</th><th>Částka</th></tr></thead><tbody>{$rows}</tbody></table>
  </section>
  <div class="totalbox"><label>{$amountLabel}</label><strong>{$amount}</strong></div>
  <div class="payment">{$payment}</div>
  <p class="note">{$note}</p>
  <footer class="footer"><span>Chata Hliněnka · david@mikala.cz · +420 605 270 444</span><span>www.chatahlinenka.cz</span></footer>
</main>
{$qrScript}
</body></html>
HTML;
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
    if ($action === 'calendar' || $action === 'admin') echalupy_refresh();
    if ($action === 'invoice-view') {
        $token = (string)($_GET['token'] ?? '');
        if (!preg_match('/^[0-9a-f]{48}$/D', $token)) err('Doklad nebyl nalezen.', 404);
        $inv = data_store(function(array &$d, bool &$save) use ($token) {
            foreach ($d['invoices'] ?? [] as $doc) {
                if (hash_equals((string)($doc['token'] ?? ''), $token)) return $doc;
            }
            return null;
        });
        if ($inv === null) err('Doklad nebyl nalezen.', 404);
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex, nofollow, noarchive');
        header('X-Frame-Options: DENY');
        echo invoice_html($inv);
        exit;
    }
    if ($action === 'calendar') {
        $view = data_store(function(array &$d, bool &$save) {
            return [
                'occupied' => array_values(array_merge(
                    array_map(fn($r) => ['start' => $r['start'], 'end' => $r['end']],
                        array_values(array_filter($d['records'] ?? [], fn($r) => ($r['status'] ?? '') === 'approved'))),
                    $d['echalupyOccupied'] ?? []
                )),
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
        $rows = data_store(fn(array &$d, bool &$save) => array_values(array_filter($d['records'] ?? [],
            fn($r) => ($r['status'] ?? '') === 'approved' && ($r['source'] ?? '') !== 'iCal')));
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
        send_json(['ok' => true, 'records' => $d['records'] ?? [], 'pricing' => pricing_values($d),
            'notificationRecipient' => OWNER_MAIL, 'mailTransport' => mail_transport_name(),
            'billingSettings' => billing_settings($d), 'billingReady' => billing_ready(billing_settings($d)),
            'invoices' => private_documents($d),
            'echalupy' => ['configured'=>!empty($d['echalupyUrl']),
                'lastOk'=>(int)($d['echalupyLastOk'] ?? 0),
                'count'=>count($d['echalupyOccupied'] ?? []),
                'error'=>(string)($d['echalupyError'] ?? '')]]);
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

// U verejnych poptavek pravidelne obnovit i zmeny z e-chalupy.
if (in_array($action, ['inquiry','decision','block'], true)) echalupy_refresh();

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
        if (overlaps($d['records'] ?? [], $start, $end) || echalupy_conflict($d, $start, $end)) {
            return ['error' => 'Zvolený termín je obsazený v kalendáři Chaty Hliněnka nebo e-chalupy.cz.'];
        }
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
    // Stav odeslani ulozit k rezervaci – i pri selhani emailu se zaznam neztrati.
    data_store(function(array &$d, bool &$save) use ($r, $notified) {
        foreach ($d['records'] as &$record) {
            if (($record['id'] ?? '') !== $r['id']) continue;
            $record['emailNoticeStatus'] = $notified ? 'accepted' : 'failed';
            $record['emailNoticeAt'] = date(DATE_ATOM);
            $save = true;
            break;
        }
        return null;
    });
    // Potvrzeni o PRIJETI poptavky, nikoli o schvaleni rezervace.
    // Odesilame az po ulozeni zaznamu a upozorneni majitele.
    $guestNotified = send_guest_inquiry_receipt($r);
    data_store(function(array &$d, bool &$save) use ($r, $guestNotified) {
        foreach ($d['records'] as &$record) {
            if (($record['id'] ?? '') !== $r['id']) continue;
            $record['guestNoticeStatus'] = $guestNotified ? 'accepted' : 'failed';
            $record['guestNoticeAt'] = date(DATE_ATOM);
            $save = true;
            break;
        }
        return null;
    });
    send_json(['ok' => true, 'saved' => true, 'notified' => $notified, 'guestNotified' => $guestNotified,
        'message' => $notified
        ? 'Poptávka byla bezpečně uložena. Upozornění jsme předali poštovní službě, ale doručení e-mailu nelze automaticky potvrdit.'
        : 'Poptávka byla uložena do správy rezervací, ale upozornění e-mailem se nepodařilo odeslat. Prosíme, kontaktujte nás také telefonicky.']);
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

if ($action === 'retry-inquiry-notice') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $r = data_store(function(array &$d, bool &$save) use ($id) {
        foreach ($d['records'] ?? [] as $item) if (($item['id'] ?? '') === $id) return $item;
        return null;
    });
    if (!$r || ($r['source'] ?? '') !== 'Web') err('Webova poptavka nebyla nalezena.', 404);
    $name = (string)($r['name'] ?? '');
    $email = (string)($r['email'] ?? '');
    $text = "Znovu zaslane upozorneni na poptavku Chaty Hlinenka\n\n"
        ."Jmeno: ".$name."\nE-mail: ".$email."\nTelefon: ".($r['phone'] ?? '')
        ."\nPocet hostu: ".($r['people'] ?? '')
        ."\nTermin: ".$r['start']." az ".$r['end']
        ."\nCena: ".($r['price'] === null ? 'Na vyzadani' : number_format((int)$r['price'], 0, ',', ' ').' Kc')
        ."\nPoznamka: ".($r['message'] ?? '')
        ."\n\nSprava: https://www.chatahlinenka.cz/sprava-rezervaci.html";
    $sent = send_mail_text(OWNER_MAIL, 'Upozorneni na poptavku – Chata Hlinenka', $text,
        filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null);
    data_store(function(array &$d, bool &$save) use ($id, $sent) {
        foreach ($d['records'] as &$record) {
            if (($record['id'] ?? '') !== $id) continue;
            $record['emailNoticeStatus'] = $sent ? 'accepted' : 'failed';
            $record['emailNoticeAt'] = date(DATE_ATOM);
            $save = true;
            break;
        }
        return null;
    });
    send_json(['ok' => true, 'notified' => $sent]);
}
if ($action === 'billing-settings') {
    $sellerName = required_text($body['sellerName'] ?? null, 150, 'dodavatel');
    $sellerAddress = required_text($body['sellerAddress'] ?? null, 300, 'adresa dodavatele');
    $sellerId = required_text($body['sellerId'] ?? null, 8, 'IČO');
    if (!preg_match('/^\d{8}$/D', $sellerId)) err('IČO musí obsahovat 8 číslic.');
    $vatMode = (string)($body['vatMode'] ?? '');
    if (!in_array($vatMode, ['nonvat','vat'], true)) err('Vyberte, zda je ubytovatel plátce DPH.');
    $vatId = trim((string)($body['sellerVatId'] ?? ''));
    if (mb_strlen($vatId) > 24) err('DIČ je příliš dlouhé.');
    if ($vatMode === 'vat' && $vatId === '') err('Plátce DPH musí vyplnit DIČ.');
    $iban = strtoupper(preg_replace('/\s+/', '', (string)($body['iban'] ?? '')));
    if (!valid_cz_iban($iban)) err('Zadejte platný český IBAN.');
    $bankAccount = trim((string)($body['bankAccount'] ?? ''));
    if (mb_strlen($bankAccount) > 80) err('Číslo bankovního účtu je příliš dlouhé.');
    $settings = compact('sellerName','sellerAddress','sellerId','vatMode','iban','bankAccount');
    $settings['sellerVatId'] = $vatId;
    data_store(function(array &$d, bool &$save) use ($settings) {
        $d['billingSettings'] = $settings;
        $save = true;
    });
    send_json(['ok'=>true,'ready'=>billing_ready($settings),
        'message'=>$vatMode==='vat'
          ? 'Nastavení uloženo. Automatické vystavování daňových dokladů plátce DPH není aktivní; je nutné ověřit DPH režim a daňové doklady k zálohám.'
          : 'Fakturační údaje uloženy. Automatická vystavování proformy a vyúčtování jsou připravena.']);
}
if ($action === 'invoice-customer') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $name = required_text($body['name'] ?? null, 150, 'fakturační jméno odběratele');
    $address = required_text($body['address'] ?? null, 300, 'fakturační adresa odběratele');
    data_store(function(array &$d, bool &$save) use ($id, $name, $address) {
        foreach ($d['records'] as &$record) {
            if (($record['id'] ?? '') !== $id) continue;
            if (invoice_record($d, $id, 'deposit')) err('Pro již vystavené doklady nelze měnit fakturační údaje. Kontaktujte správce.', 409);
            $record['billingName'] = $name;
            $record['billingAddress'] = $address;
            $save = true;
            return null;
        }
        err('Rezervace nenalezena.', 404);
    });
    send_json(['ok'=>true]);
}
if ($action === 'set-agreed-price') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $price = filter_var($body['price'] ?? null, FILTER_VALIDATE_INT);
    if ($price === false || $price < 1000 || $price > 1000000) err('Cena musí být celé Kč od 1 000 do 1 000 000.');
    data_store(function(array &$d, bool &$save) use ($id, $price) {
        foreach ($d['records'] as &$r) {
            if (($r['id'] ?? '') !== $id) continue;
            if (($r['status'] ?? '') !== 'pending' || invoice_record($d, $id, 'deposit')) {
                err('Cenu lze upravit jen u nové poptávky před vystavením dokladu.',409);
            }
            $r['price'] = $price;
            $save = true;
            return null;
        }
        err('Rezervace nenalezena.',404);
    });
    send_json(['ok'=>true]);
}
if ($action === 'resend-invoice') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $inv = data_store(function(array &$d, bool &$save) use ($id) {
        foreach ($d['invoices'] ?? [] as $document) if (($document['id'] ?? '') === $id) return $document;
        return null;
    });
    if (!$inv || !filter_var($inv['customerEmail'] ?? '', FILTER_VALIDATE_EMAIL)) err('Doklad nebyl nalezen nebo chybí e-mail.',404);
    if (($inv['status'] ?? '') === 'cancelled') err('Zrušený doklad nelze znovu odeslat jako platební výzvu.',409);
    $link = invoice_public_link($inv);
    $sent = send_mail_text($inv['customerEmail'], $inv['type'] === 'deposit'
            ? 'Zálohová faktura k pobytu – Chata Hliněnka'
            : ($inv['type'] === 'balance' ? 'Podklady pro doplatek pobytu – Chata Hliněnka' : 'Vyúčtování pobytu – Chata Hliněnka'),
        "Dobrý den,\n\nzasíláme vám doklad ".$inv['number']." k pobytu na Chatě Hliněnka ("
          .$inv['dateStart']." – ".$inv['dateEnd'].").\n\nDoklad k zobrazení, tisku a uložení jako PDF:\n".$link
          ."\n\nS pozdravem\nChata Hliněnka", OWNER_MAIL);
    send_json(['ok'=>true,'notified'=>$sent]);
}
if ($action === 'record-balance') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $result = data_store(function(array &$d, bool &$save) use ($id) {
        foreach ($d['records'] as &$r) {
            if (($r['id'] ?? '') !== $id) continue;
            if (($r['status'] ?? '') !== 'approved' || empty($r['depositPaidAt'])) {
                return ['error'=>'Rezervace není potvrzena po přijetí zálohy.'];
            }
            if (!empty($r['balancePaidAt']) || invoice_record($d, $id, 'final')) {
                return ['error'=>'Doplatek už je evidován.'];
            }
            $r['balancePaidAt'] = date(DATE_ATOM);
            foreach ($d['invoices'] ?? [] as &$doc) {
                if (($doc['reservationId'] ?? '') === $id && ($doc['type'] ?? '') === 'balance') {
                    $doc['status'] = 'paid'; $doc['paidAt'] = date(DATE_ATOM);
                }
            }
            unset($doc);
            $inv = create_invoice($d, $r, 'final', 0);
            $r['finalInvoiceId'] = $inv['id'];
            $save = true;
            return ['invoice'=>$inv];
        }
        return ['error'=>'Rezervace nenalezena.'];
    });
    if (isset($result['error'])) err($result['error'], 409);
    $inv = $result['invoice'];
    $sent = empty($inv['customerEmail']) ? false : send_mail_text(
        $inv['customerEmail'],'Vyúčtování pobytu – Chata Hliněnka',
        "Dobrý den,\n\npotvrzujeme přijetí doplatku za pobyt na Chatě Hliněnka.\n"
          ."Vaše vyúčtovací faktura ".$inv['number']." je vystavená, zbývá uhradit 0 Kč.\n\n"
          ."Doklad: ".invoice_public_link($inv)."\n\nTěšíme se na vás!\nChata Hliněnka", OWNER_MAIL);
    send_json(['ok'=>true,'notified'=>$sent,'invoice'=>$inv['number']]);
}

if ($action === 'decision') {
    $id = required_text($body['id'] ?? null, 80, 'ID');
    $status = (string)($body['status'] ?? '');
    if (!in_array($status, ['awaiting_deposit', 'approved', 'rejected'], true)) err('Neznámý stav.');
    $result = data_store(function(array &$d, bool &$save) use ($id, $status) {
        foreach ($d['records'] as &$r) {
            if (($r['id'] ?? '') !== $id) continue;
            $current = (string)($r['status'] ?? 'pending');
            $validTransition = match ($status) {
                'awaiting_deposit' => $current === 'pending',
                'approved' => $current === 'awaiting_deposit',
                'rejected' => in_array($current, ['pending', 'awaiting_deposit', 'approved'], true),
                default => false
            };
            if (!$validTransition) return ['error'=>'Tuto změnu stavu nelze provést.'];
            if ($status === 'approved' &&
                (overlaps($d['records'] ?? [], $r['start'], $r['end'], $id)
                 || echalupy_conflict($d, $r['start'], $r['end']))) {
                return ['error'=>'Termín mezitím potvrdila jiná rezervace. Platbu je nutné individuálně vypořádat.'];
            }
            if ($status === 'rejected' && !empty($r['depositPaidAt'])) {
                return ['error'=>'Zaplacenou rezervaci je třeba nejprve individuálně vypořádat včetně případného storna a dokladů.'];
            }
            $invoice = null;
            if ($status === 'awaiting_deposit') {
                $settings = billing_settings($d);
                if (!billing_ready($settings)) {
                    return ['error'=>'Nejprve vyplňte úplné fakturační údaje, IBAN a režim DPH v administraci. Automatická fakturace zatím podporuje pouze ověřený režim neplátce DPH.'];
                }
                if (!isset($r['price']) || !is_numeric($r['price']) || (int)$r['price'] < 1) {
                    return ['error'=>'U této poptávky nejprve nastavte písemně dohodnutou celkovou cenu pobytu.'];
                }
                if (empty($r['billingAddress'])) {
                    return ['error'=>'Nejprve doplňte fakturační jméno a adresu odběratele.'];
                }
                if (invoice_record($d, $id, 'deposit')) return ['error'=>'Zálohová faktura už existuje.'];
                $year = date('Y');
                $d['paymentSequences'] ??= [];
                $d['paymentSequences'][$year] = (int)($d['paymentSequences'][$year] ?? 0) + 1;
                if ($d['paymentSequences'][$year] > 999999) return ['error'=>'Vyčerpána číselná řada plateb.'];
                $r['paymentVs'] = $year.str_pad((string)$d['paymentSequences'][$year], 6, '0', STR_PAD_LEFT);
                $invoice = create_invoice($d, $r, 'deposit', intdiv((int)$r['price']+1, 2));
                $r['invoiceDepositId'] = $invoice['id'];
            }
            if ($status === 'approved') {
                $deposit = invoice_record($d, $id, 'deposit');
                if (!$deposit) return ['error'=>'Chybí vystavená zálohová faktura.'];
                $r['depositPaidAt'] = date(DATE_ATOM);
                $r['depositAmountPaid'] = (int)$deposit['amount'];
                foreach ($d['invoices'] as &$doc) {
                    if (($doc['id'] ?? '') === $deposit['id']) {
                        $doc['status'] = 'paid'; $doc['paidAt'] = date(DATE_ATOM);
                        break;
                    }
                }
                unset($doc);
                $invoice = create_invoice($d, $r, 'balance', (int)$r['price']-(int)$deposit['amount']);
                $r['invoiceBalanceId'] = $invoice['id'];
            }
            if ($status === 'rejected') {
                foreach ($d['invoices'] ?? [] as &$doc) {
                    if (($doc['reservationId'] ?? '') === $id && ($doc['status'] ?? '') === 'issued') {
                        $doc['status'] = 'cancelled';
                    }
                }
                unset($doc);
            }
            $r['status'] = $status;
            $r['updatedAt'] = date(DATE_ATOM);
            $save = true;
            return ['record'=>$r,'invoice'=>$invoice];
        }
        return ['error'=>'Rezervace nebyla nalezena.'];
    });
    if (isset($result['error'])) err($result['error'],409);
    $r = $result['record'];
    $invoice = $result['invoice'];
    $sent = true;
    if (!empty($r['email'])) {
        if ($status === 'awaiting_deposit') {
            $text = "Dobrý den,\n\nVaši poptávku na Chatu Hliněnka jsme předběžně odsouhlasili a zasíláme "
              ."platební podklady k rezervaci termínu ".$r['start']." až ".$r['end'].".\n\n"
              ."Zálohová faktura č. ".$invoice['number']."\n"
              ."Záloha (50 % ceny pobytu): ".money_cz((int)$invoice['amount'])."\n"
              ."Splatnost: ".date_cz($invoice['due'])." (5 kalendářních dnů)\n"
              ."Variabilní symbol: ".$invoice['variableSymbol']."\n\n"
              ."Faktura s QR platbou – otevřít, vytisknout nebo uložit jako PDF:\n"
              .invoice_public_link($invoice)."\n\n"
              ."Rezervace se stane závaznou až po vašem odsouhlasení nabídky a našem písemném potvrzení. "
              ."To zašleme po připsání zálohy na účet.\n\nS pozdravem\nChata Hliněnka";
            $sent = send_mail_text($r['email'], 'Zálohová faktura k rezervaci – Chata Hliněnka', $text, OWNER_MAIL);
        } elseif ($status === 'approved') {
            $text = "Dobrý den,\n\npotvrzujeme váš termín pobytu na Chatě Hliněnka: "
              .$r['start']." až ".$r['end'].".\n\n"
              ."Záloha ".money_cz((int)$r['depositAmountPaid'])." byla přijata. "
              ."Termín je potvrzen a veden jako obsazený.\n\n"
              ."Zbývající doplatek: ".money_cz((int)$invoice['amount']).". "
              ."Uhraďte jej dle platebních pokynů, nejpozději před předáním chaty.\n\n"
              ."Podklady k doplatku včetně QR platby: ".invoice_public_link($invoice)."\n\n"
              ."Na dalších podrobnostech se domluvíme e-mailem nebo telefonicky.\nChata Hliněnka";
            $sent = send_mail_text($r['email'], 'Potvrzení pobytu – Chata Hliněnka', $text, OWNER_MAIL);
        } else {
            $text = "Bohužel nemůžeme potvrdit vámi poptávaný termín na Chatě Hliněnka: "
                .$r['start']." až ".$r['end'].".\n\nNa podrobnostech se domluvíme e-mailem nebo telefonicky.\nChata Hliněnka";
            $sent = send_mail_text($r['email'], 'Poptávka pobytu – Chata Hliněnka', $text, OWNER_MAIL);
        }
    }
    if ($status === 'awaiting_deposit') {
        send_json(['ok'=>true, 'notified'=>$sent, 'invoice'=>$invoice['number'],
            'message'=>$sent ? 'Zálohová faktura vystavena a e-mail předán poštovní službě. Termín není blokován.'
                            : 'Zálohová faktura vystavena, ale e-mail se nepodařilo předat. Otevřete doklad a odešlete jej ručně.']);
    }
    send_json(['ok'=>true,'notified'=>$sent]);
}
if ($action === 'block') {
    $start = (string)($body['start'] ?? ''); $end = (string)($body['end'] ?? '');
    check_dates($start, $end);
    $name = required_text($body['name'] ?? null, 120, 'důvod');
    $result = data_store(function(array &$d, bool &$save) use ($start, $end, $name) {
        if (overlaps($d['records'], $start, $end) || echalupy_conflict($d, $start, $end)) return false;
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
        foreach ($d['invoices'] ?? [] as $inv) {
            if (($inv['reservationId'] ?? '') === $id) err('Rezervaci s vystaveným dokladem nelze smazat. Doklady musí zůstat v evidenci.',409);
        }
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
if ($action === 'echalupy-config') {
    require_admin();
    $url = trim((string)($body['url'] ?? ''));
    if ($url !== '' && echalupy_feed_url($url) === null) {
        err('Vložte platný HTTPS iCal odkaz z domény e-chalupy.cz.');
    }
    data_store(static function(array &$d, bool &$save) use ($url): void {
        $d['echalupyUrl'] = $url;
        $d['echalupyOccupied'] = [];
        $d['echalupyLastAttempt'] = 0;
        $d['echalupyLastOk'] = 0;
        $d['echalupyError'] = '';
        $save = true;
    });
    if ($url === '') send_json(['ok'=>true, 'message'=>'Propojení s e-chalupy.cz bylo vypnuto.']);
    $sync = echalupy_refresh(true);
    send_json(['ok'=>true, 'sync'=>$sync,
        'message'=>empty($sync['error'])
            ? 'iCal připojen. Načteno obsazených intervalů: '.$sync['count'].'.'
            : 'Odkaz byl uložen, ale zatím se nepodařilo kalendář načíst. Zkontrolujte export na e-chalupy.cz.']);
}
if ($action === 'echalupy-sync') {
    require_admin();
    $sync = echalupy_refresh(true);
    send_json(['ok'=>true,'sync'=>$sync]);
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
