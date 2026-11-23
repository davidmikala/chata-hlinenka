# Fakturace Chaty Hliněnka – interní postup

## Nastavení před prvním dokladem

1. Otevřít **https://www.chatahlinenka.cz/sprava-rezervaci.html** a přihlásit se kódem zaslaným na david@mikala.cz.
2. V sekci **Fakturační údaje a automatické doklady** vyplnit pravdivé údaje skutečného provozovatele Chaty Hliněnka (jméno, sídlo, IČO, případné DIČ, režim DPH, bankovní účet, IBAN). **Nepřebírat údaje firmy MIKALA.**
3. Faktury se nezačnou automaticky vystavovat, dokud není nastavení kompletní. Automatické vystavování je zatím určeno pouze pro správně potvrzený režim **neplátce DPH**. Pokud je ubytovatel plátcem DPH, je nutné navázat po ověření zákonných pravidel pro doklady k přijatým platbám.
4. U rezervace před vystavením dokladu vyplnit **Fakturační údaje hosta** (jméno, úplná adresa). U speciálních termínů nebo pokud byla sjednána jiná cena použít **Upravit sjednanou cenu**.

## Proces podle VOP (účinnost 23. 11. 2026)

- **Poptávka:** zatím bez faktury a bez blokace termínu.
- **Odsouhlasit nabídku – vystavit zálohu:** vytvoří se číslovaná **zálohová faktura / proforma** na **50 % ceny pobytu** se splatností **5 kalendářních dnů**, zákazníkovi se odešle e-mail s odkazem na doklad a QR platbu. Stav **Čeká na úhradu zálohy** je pouze interní. Termín se stále veřejně zobrazuje jako volný.
- **Záloha přijata – potvrdit:** provést až po skutečném připsání peněz na účet; označí proformu zaplacenou, potvrdí pobyt, zobrazí termín jako obsazený, odešle potvrzení a vygeneruje výzvu k doplatku zbývajících **50 %**, rovněž s QR platbou.
- **Doplatek přijat – vystavit vyúčtování:** po potvrzení platby v administraci uloží zaplacení doplatku a vytvoří číslovanou **vyúčtovací fakturu** na celkovou cenu s odečtením zálohy a doplatku (k úhradě 0 Kč). Doklad se automaticky odešle zákazníkovi.
- **Vratná kauce 5 000 Kč** se eviduje odděleně od ubytování podle VOP: připsání 2 kalendářní dny před příjezdem, vrácení nevyčerpané kauce do 5 kalendářních dnů po odjezdu.

## Doklady

- Zálohová faktura: řada **ZROK-0001**, proforma (nikoli daňový doklad).
- Výzva na doplatek: řada **DROK-0001**, nikoli daňový doklad.
- Vyúčtovací faktura: řada **FROK-0001**.
- Pro platební převody je u pobytu jednotný číselný **variabilní symbol**.
- QR platba používá standard **SPAYD** a český IBAN. QR kód se vykresluje lokálně pomocí knihovny qrcodejs (MIT) na dokladech s částkou k úhradě. Na plně uhrazeném vyúčtování se QR platba nezobrazuje, protože zbývá uhradit 0 Kč.
- Doklady mají nezaměnitelné číselné řady a ukládají se jako snímky údajů v soukromém souboru `.hlinenka-private/reservations.json`. Doklady je možné otevřít, vytisknout nebo z prohlížeče **uložit jako PDF**.
- Zákazník dostane e-mailem obtížně uhodnutelný odkaz na svůj konkrétní doklad. Sdílet jej pouze s oprávněným příjemcem.
- Vystavené doklady nelze smazat vymazáním rezervace; případná oprava nebo dobropis vyžaduje zvláštní řešení.

## Důležitá omezení

- **Systém nemá přístup k bankovnímu účtu.** Skutečné připsání zálohy a doplatku se potvrzuje ručně tlačítkem v administraci. Nepotvrzovat platbu pouze podle příslibu hosta.
- **Neplátce DPH**: proforma ani výzva na doplatek nejsou daňové doklady; vyúčtovací faktura obsahuje přijaté platby a informaci, že vystavovatel není plátcem DPH.
- **Plátce DPH**: automatické vystavování je zablokováno, dokud není implementováno zdanění přijatých záloh a správné daňové doklady podle zákona o DPH. Nesmí vznikat nesprávné daňové doklady.
- Fakturační řada i původní texty VOP se tímto nasazením nemění zpětně.
- Ověřit bankovní účet, IČO a režim DPH před prvním ostrým použitím.

Standard QR Platba: https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
