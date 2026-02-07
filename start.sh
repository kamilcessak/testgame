#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PLIK: start.sh                                                              ║
# ║  CO ROBI: Uruchamia lokalny serwer HTTP żeby można było testować aplikację   ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# DLACZEGO POTRZEBNY SERWER?
# - Moduły ES6 (import/export) NIE działają gdy otworzysz plik file:// w przeglądarce
# - Przeglądarka wymaga protokołu http:// lub https://
# - Ten skrypt uruchamia prosty serwer HTTP używając Pythona
#
# JAK UŻYWAĆ:
#   ./start.sh        # uruchomi serwer na porcie 8001
#   ./start.sh 3000   # uruchomi serwer na porcie 3000
#
# Po uruchomieniu otwórz w przeglądarce: http://localhost:8001
#
# ═══════════════════════════════════════════════════════════════════════════════

# #!/usr/bin/env bash
# ↑ "Shebang" - mówi systemowi, że to skrypt bash
# /usr/bin/env bash - szuka bash w PATH (bardziej przenośne niż /bin/bash)

# cd "$(dirname "$0")/public"
# ↑ Wejdź do folderu public/ (tam gdzie jest skrypt)
#   $0 = ścieżka do tego skryptu
#   dirname = wyciąga folder ze ścieżki
#   $(...) = wykonaj komendę i wstaw wynik

# python3 -m http.server
# ↑ Uruchamia wbudowany serwer HTTP Pythona
#   -m http.server = moduł serwera HTTP

# "${1:-8001}"
# ↑ Port na którym uruchomić serwer
#   $1 = pierwszy argument przekazany do skryptu
#   :- = jeśli $1 jest puste, użyj wartości domyślnej
#   8001 = domyślny port

cd "$(dirname "$0")/public" && python3 -m http.server "${1:-8001}"
