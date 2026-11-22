# Odesílání poptávek Chaty Hliněnka – SMTP

Příjemce všech nových poptávek je **david@mikala.cz**. Jde o nezávazné poptávky; termín se potvrdí až v administraci.

## Proč samotné `mail()` nestačí

Webglobe doporučuje pro e-maily z webových formulářů používat ověřené SMTP. Předání zprávy přes PHP `mail()` nepotvrzuje její skutečné doručení a může skončit ve spamu.

Aktuální rezervační API používá, je-li dostupná, bezpečnou konfiguraci SMTP mimo veřejnou složku. Jinak zůstane u PHP `mail()`, přičemž výsledek odeslání lze vidět v administraci.

## Nastavení na hostingu (bez sdílení hesla v chatu / GitHubu)

1. V administraci Webglobe zkontrolovat existující skutečnou odesílací e-mailovou schránku a ověřit SMTP údaje jejího poskytovatele. Pro schránku hostovanou u Webglobe: **mail.webglobe.cz**, port **465 (SSL/TLS)** nebo **587 (STARTTLS)**.
2. V soukromé složce hostingu, která už obsahuje `reservations.json` a je **mimo** adresář `public_html`, vytvořit soubor `smtp-config.php`. Jde o složku `.hlinenka-private` vedle veřejného webu.
3. Vložit tuto strukturu a nahradit ukázkové hodnoty skutečnou odesílací schránkou a jejím heslem:

```php
<?php
return [
    'host' => 'mail.webglobe.cz',
    'port' => 587,
    'user' => 'skutecna-odesilaci-schranka@example.cz',
    'password' => 'HESLO_SCHRANKY',
    'from' => 'skutecna-odesilaci-schranka@example.cz',
];
```

4. Nastavit přístup k souboru pouze pro vlastníka / proces PHP (např. chmod 600 pokud to hosting umožňuje).
5. V administraci `/sprava-rezervaci.html` zkontrolovat, že v části „Poptávky a rezervace“ se zobrazuje **Ověřené SMTP**. Pro již uloženou poptávku lze použít tlačítko „Znovu poslat upozornění“.
6. Odeslat jednu novou TESTOVACÍ poptávku a ověřit doručení do schránky `david@mikala.cz`, včetně složky Spam. Po testu lze záznam odstranit v administraci.

**Heslo neukládat do repozitáře, neodesílat v chatu ani neumisťovat do `public_html`.**

Webglobe: https://www.webglobe.cz/poradna/odesilani-emailu-z-webu
