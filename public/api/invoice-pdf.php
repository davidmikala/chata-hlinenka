<?php
declare(strict_types=1);

/**
 * Serverové PDF v odsouhlaseném stylu A – Přírodní elegance.
 * Nepoužívá externí PDF ani QR službu, osobní údaje neopouštějí hosting.
 * Vstup: nezměnitelný snímek dokladu z privátního úložiště.
 */
if (!defined('HLINENKA_PDF_INTERNAL')) {
    http_response_code(404);
    exit;
}

function invoice_pdf_available(): bool {
    return is_file(__DIR__.'/vendor/autoload.php');
}

function invoice_pdf_bytes(array $inv): string {
    if (!invoice_pdf_available()) {
        throw new RuntimeException('Na hostingu chybí PDF knihovna.');
    }
    require_once __DIR__.'/vendor/autoload.php';
    if (!class_exists('TCPDF')) {
        throw new RuntimeException('Nelze načíst knihovnu pro PDF.');
    }

    $kind = (string)($inv['type'] ?? '');
    $titles = [
        'deposit' => 'ZÁLOHOVÁ FAKTURA',
        'balance' => 'VÝZVA K DOPLATKU',
        'full' => 'FAKTURA ZA POBYT',
        'final' => 'ZÚČTOVACÍ FAKTURA',
    ];
    if (!isset($titles[$kind])) throw new InvalidArgumentException('Neznámý typ faktury.');
    $seller = $inv['seller'] ?? [];
    if (($seller['vatMode'] ?? '') !== 'nonvat') {
        throw new LogicException('Automatické faktury jsou určeny jen pro ověřeného neplátce DPH.');
    }
    $number = (string)$inv['number'];
    $totalValue = (int)$inv['total'];
    $amountDue = (int)$inv['amount'];
    $paidDeposit = (int)($inv['depositPaid'] ?? 0);
    $paymentStatus = (string)($inv['status'] ?? 'issued');
    $isFinal = $kind === 'final';
    $isPaid = $paymentStatus === 'paid';
    $qrEnabled = !$isFinal && !$isPaid && $paymentStatus !== 'cancelled' && $amountDue > 0;
    $stay = date_cz((string)$inv['dateStart']).' – '.date_cz((string)$inv['dateEnd']);
    $nights = days_between((string)$inv['dateStart'], (string)$inv['dateEnd']);
    $money = static fn(int $v): string => money_cz($v);

    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetCreator('Chata Hliněnka');
    $pdf->SetAuthor((string)$seller['sellerName']);
    $pdf->SetTitle($titles[$kind].' '.$number);
    $pdf->SetPrintHeader(false);
    $pdf->SetPrintFooter(false);
    $pdf->SetMargins(18, 15, 18);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->setFontSubsetting(true);
    $pdf->AddPage();

    $green = [29, 70, 50];
    $gold = [182, 139, 75];
    $muted = [100, 120, 105];
    $dark = [25, 54, 40];
    $cream = [247, 244, 233];
    $white = [255, 253, 248];

    $color = static function (array $c) use ($pdf): void { $pdf->SetTextColor($c[0], $c[1], $c[2]); };
    $text = static function (float $x, float $y, float $w, string $str, float $size=10, bool $bold=false, string $align='L') use ($pdf, $color, $dark): void {
        $pdf->SetFont('dejavusans', $bold ? 'B' : '', $size);
        $color($dark);
        $pdf->SetXY($x, $y);
        $pdf->MultiCell($w, 5, $str, 0, $align, false, 1, '', '', true, 0, false, true);
    };
    $small = static function (float $x, float $y, float $w, string $str, bool $bold=false) use ($pdf, $color, $muted): void {
        $pdf->SetFont('dejavusans', $bold ? 'B' : '', 8.4);
        $color($muted);
        $pdf->SetXY($x, $y);
        $pdf->MultiCell($w, 4.5, $str, 0, 'L', false, 1, '', '', true, 0, false, true);
    };
    $pdf->SetFillColor(...$white);
    $pdf->Rect(0, 0, 210, 297, 'F');
    $pdf->SetFillColor(...$green);
    $pdf->Rect(0, 0, 210, 13, 'F');

    // Záhlaví podle vybrané varianty 1. Originální logo bez jakýchkoli úprav.
    $logo = dirname(__DIR__).'/email/logo-hlinenka-prirodni.jpg';
    if (is_file($logo) && is_readable($logo)) {
        $pdf->Image($logo, 18, 22, 23, 23, 'JPG');
    }
    $color($green);
    $pdf->SetFont('dejavuserif', 'B', 21);
    $pdf->SetXY(47, 25);
    $pdf->Cell(111, 10, 'Chata Hliněnka', 0, 0, 'L');
    $small(48, 36, 112, 'Hlinsko pod Hostýnem · www.chatahlinenka.cz');
    $small(153, 28, 41, 'HOSTÝNSKÉ VRCHY', true);
    $small(160, 35, 33, 'ubytování v přírodě');
    $pdf->SetDrawColor(...$gold);
    $pdf->SetLineWidth(0.75);
    $pdf->Line(18, 50, 192, 50);

    $color($green);
    $pdf->SetFont('dejavuserif', 'B', 22);
    $pdf->SetXY(18, 55);
    $pdf->Cell(175, 12, $titles[$kind], 0, 0);
    $text(18, 69, 120, 'Číslo dokladu: '.$number, 10, true);
    $statusLabel = $paymentStatus === 'cancelled' ? 'ZRUŠENO' : ($isPaid || $isFinal ? 'UHRAZENO' : 'K ÚHRADĚ');
    $pdf->SetFillColor(235, 240, 232);
    $pdf->RoundedRect(148, 69, 43, 9, 2, '1111', 'F');
    $text(150, 70, 39, $statusLabel, 9, true, 'C');

    // Údaje obou smluvních stran.
    $pdf->SetFillColor(...$cream);
    $pdf->RoundedRect(18, 85, 174, 56, 2, '1111', 'F');
    $small(24, 90, 75, 'DODAVATEL', true);
    $small(111, 90, 75, 'ODBĚRATEL', true);
    $vendor = trim((string)$seller['sellerName'])."\n"
        .trim((string)$seller['sellerAddress'])."\n"
        .'IČO: '.trim((string)$seller['sellerId'])."\n"
        .'Neplátce DPH';
    $buyer = trim((string)($inv['customerName'] ?? ''))."\n"
        .trim((string)($inv['customerAddress'] ?? ''));
    $text(24, 96, 78, $vendor, 9.2);
    $text(111, 96, 76, $buyer, 9.2);

    $small(18, 148, 67, 'DATUM VYSTAVENÍ', true);
    $small(80, 148, 59, 'SPLATNOST / STAV', true);
    $small(143, 148, 49, 'TERMÍN POBYTU', true);
    $text(18, 154, 58, date_cz((string)$inv['issued']), 9.5, true);
    $due = $isFinal || $isPaid ? 'Uhrazeno' : ($inv['due'] ? date_cz((string)$inv['due']) : 'Dle pokynů');
    $text(80, 154, 59, $due, 9.5, true);
    $text(143, 154, 49, $stay, 8.1, true);

    // Tabulka položek: konečné vyúčtování odečítá obě úhrady.
    $pdf->SetFillColor(237, 240, 232);
    $pdf->Rect(18, 170, 174, 10, 'F');
    $small(22, 172, 130, 'POLOŽKA / POPIS', true);
    $small(150, 172, 38, 'ČÁSTKA', true);
    $rows = [];
    $rows[] = ['Ubytování – Chata Hliněnka ('.$nights.' nocí)', $money($totalValue)];
    if ($isFinal) {
        $rows[] = ['Uhrazená záloha', '− '.$money($paidDeposit)];
        $rows[] = ['Uhrazený doplatek', '− '.$money(max(0, $totalValue - $paidDeposit))];
    } elseif ($kind === 'deposit') {
        $rows[] = ['Rezervační záloha 50 %', $money($amountDue)];
    } elseif ($kind === 'balance') {
        $rows[] = ['Již uhrazená záloha', '− '.$money($paidDeposit)];
        $rows[] = ['Doplatek ceny pobytu', $money($amountDue)];
    } else {
        $rows[] = ['Jednorázová platba 100 % před příjezdem', $money($amountDue)];
    }
    foreach ($rows as $idx => $row) {
        $y = 184 + 10.5*$idx;
        $text(22, $y, 124, $row[0], 9);
        $text(148, $y, 40, $row[1], 9.1, true, 'R');
        $pdf->SetDrawColor(223, 229, 219);
        $pdf->Line(18, $y+9.3, 192, $y+9.3);
    }
    $boxY = 187+10.5*count($rows);
    $boxY = max(211, min(224, $boxY));
    $pdf->SetFillColor(...$green);
    $pdf->RoundedRect(18, $boxY, 174, 16, 2, '1111', 'F');
    $color([255,255,255]);
    $pdf->SetFont('dejavusans','B',10);
    $pdf->SetXY(23,$boxY+3);
    $pdf->Cell(97,10,$isFinal?'ZBÝVÁ K ÚHRADĚ':($isPaid?'UHRAZENO':'ČÁSTKA K ÚHRADĚ'),0,0,'L');
    $pdf->SetFont('dejavusans','B',16);
    $pdf->Cell(66,10,$money($amountDue),0,0,'R');

    $payY = $boxY+21;
    if ($isFinal) {
        $text(19,$payY,129,'Celý pobyt uhrazen',11,true);
        $text(19,$payY+8,130,'Záloha: '.$money($paidDeposit).' · Doplatek: '.$money(max(0,$totalValue-$paidDeposit)),9);
        $text(19,$payY+17,130,'Variabilní symbol: '.(string)$inv['variableSymbol'],9);
    } else {
        $small(19,$payY,124,'PLATEBNÍ ÚDAJE',true);
        $text(19,$payY+5,126,'Účet: '.(string)($seller['bankAccount'] ?: $seller['iban']),9.5,true);
        $text(19,$payY+12,126,'IBAN: '.(string)$seller['iban'],8.5);
        $text(19,$payY+19,126,'Variabilní symbol: '.(string)$inv['variableSymbol'],9.5,true);
    }
    if ($qrEnabled) {
        $spayd = 'SPD*1.0*ACC:'.$seller['iban'].'*AM:'.number_format($amountDue,2,'.','')
            .'*CC:CZK*X-VS:'.$inv['variableSymbol'];
        $pdf->write2DBarcode($spayd,'QRCODE,M',154,$payY-1,29,29,[
            'border'=>false, 'padding'=>1, 'fgcolor'=>$green, 'bgcolor'=>[255,255,255],
        ],'N');
        $small(154,$payY+28,39,'QR PLATBA',true);
    }

    $note = 'Elektřina se hradí zvlášť dle skutečné spotřeby (7 Kč/kWh). Vratná kauce 5 000 Kč není součástí ceny ubytování.';
    if ($kind==='deposit') $note = 'Zálohová faktura (proforma) není daňovým dokladem. '.$note;
    if ($kind==='balance') $note = 'Výzva k doplatku není daňovým dokladem. '.$note;
    if ($kind==='full') $note = 'Faktura na celou cenu při rezervaci na poslední chvíli. Termín potvrdíme po připsání úhrady. '.$note;
    if ($paymentStatus==='cancelled') $note = 'DOKLAD BYL ZRUŠEN. NEPROVÁDĚJTE PLATBU. '.$note;
    $small(19,269,174,$note);
    $pdf->SetDrawColor(226,230,221);
    $pdf->Line(18,283,192,283);
    $small(18,285,120,'Chata Hliněnka · david@mikala.cz · +420 605 270 444');
    $small(152,285,40,'www.chatahlinenka.cz');

    $bytes = $pdf->Output($number.'.pdf','S');
    if (!is_string($bytes) || !str_starts_with($bytes,'%PDF-')) {
        throw new RuntimeException('Nepodařilo se vytvořit PDF doklad.');
    }
    return $bytes;
}
