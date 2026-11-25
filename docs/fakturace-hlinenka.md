# Fakturace Chaty Hliněnka – interní postup

## Nastavení před prvním dokladem

1. Otevřít **https://www.chatahlinenka.cz/sprava-rezervaci.html** a přihlásit se kódem zaslaným na david@mikala.cz.
2. V sekci **Fakturační údaje a automatické doklady** vyplnit pravdivé údaje skutečného provozovatele Chaty Hliněnka (jméno, sídlo, IČO, případné DIČ, režim DPH, bankovní účet, IBAN). **Nepřebírat údaje firmy MIKALA.**
3. Faktury se nezačnou automaticky vystavovat, dokud není nastavení kompletní. Automatické vystavování je zatím určeno pouze pro správně potvrzený režim **neplátce DPH**. Pokud je ubytovatel plátcem DPH, je nutné navázat po ověření zákonných pravidel pro doklady k přijatým platbám.
4. U rezervace před vystavením dokladu vyplnit **Fakturační údaje hosta** (jméno, úplná adresa). U speciálních termínů nebo pokud byla sjednána jiná cena použít **Upravit sjednanou cenu**.

## Proces podle VOP (účinnost 23. 11. 2026)

- **Poptávka:** zatím bez faktury a bez blokace termínu.
- **Odsouhlasit nabídku – vystavit doklad:** při příjezdu za více než 5 kalendářních dnů vzniká číslovaná **zálohová faktura / proforma** na **50 % ceny pobytu** se splatností **5 kalendářních dnů**. Při příjezdu **nejvýše za 5 kalendářních dnů** vzniká přímo číslovaná **faktura na 100 % ceny ubytování** se splatností ihned. **PDF faktura s QR platbou je přílohou e-mailu**, vedle toho zákazník dostane původní odkaz. Stav čekání na platbu je interní a termín ještě není blokován.
- **Platba přijata – potvrdit:** provést až po skutečném připsání příslušné platby na účet. U standardní rezervace potvrdí 50% zálohu a vygeneruje výzvu k doplatku zbývajících 50 %. **U last-minute faktury 100 %** označí doklad jako zaplacený, potvrdí termín a **nevytvoří žádný další doplatek ani duplicitní zúčtovací fakturu**.
- **Doplatek přijat – vystavit vyúčtování:** po potvrzení platby v administraci uloží zaplacení doplatku a vytvoří číslovanou **vyúčtovací fakturu** na celkovou cenu s odečtením zálohy a doplatku (k úhradě 0 Kč). Doklad se automaticky odešle zákazníkovi.
- **Vratná kauce 5 000 Kč** se eviduje odděleně od ubytování podle VOP: připsání 2 kalendářní dny před příjezdem, vrácení nevyčerpané kauce do 5 kalendářních dnů po odjezdu.

## Doklady

### Schválená jednotná šablona

Používá se **varianta 1 / A – Přírodní elegance**: krémový list A4, tmavě zelené záhlaví, zlatá linka, originální logo Chaty Hliněnka, krémový blok dodavatele a odběratele, přehledná tabulka, tmavě zelený součet a patička. Stejný vzhled používá zálohová faktura, výzva k doplatku a konečné vyúčtování. QR platba se zobrazuje jen u **nezaplaceného** dokladu s nenulovou částkou, u uhrazených dokladů ne. Na dokladu je uvedeno, že elektřina 7 Kč/kWh dle skutečné spotřeby a vratná kauce 5 000 Kč se účtují mimo cenu ubytování.


- Zálohová faktura: řada **ZROK-0001**, proforma (nikoli daňový doklad).
- Jednorázová faktura na 100 %: řada **FROK-0001** společná s vyúčtovacími fakturami; vydává se pouze u last-minute pobytů po odsouhlasení nabídky.
- Výzva na doplatek: řada **DROK-0001**, nikoli daňový doklad.
- Vyúčtovací faktura: řada **FROK-0001**.
- Pro platební převody je u pobytu jednotný číselný **variabilní symbol**.
- QR platba používá standard **SPAYD** a český IBAN. Ve webovém náhledu se kód vytváří místně pomocí knihovny qrcodejs (MIT), **v PDF je nativní QR kód vytvořen serverovou knihovnou TCPDF** (LGPL). Na uhrazených dokladech se QR platba nezobrazuje. PDF generuje přímo server, bez externí služby, a přikládá jej k zálohovým i 100% fakturám.
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
