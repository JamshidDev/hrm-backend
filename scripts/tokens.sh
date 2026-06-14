#!/usr/bin/env bash
# Test tokenlar — har role uchun vakil user (sanctum token: {userId}|{plaintext}).
# macOS bash 3.2 mos (associative array YO'Q — case funksiya).
# Yangilash: php artisan tinker → User::find(uid)->createToken("ct-test")->plainTextToken
# Ishlatish: source scripts/tokens.sh ; get_token Admin ; get_tuser Admin
# So'rovda: -H "Authorization: Bearer $(get_token Admin)" -H "X-Auth-Type: sanctum"
#
# Eslatma: Worker=Admin=user1 (user 1 da ikkala rol → Admin sifatida ishlaydi).
#   Toza Worker-403 testi uchun keyin faqat-Worker user tanlanadi.
# Bo'sh role'lar (vakil yo'q): LmsTeacher, SuperLms, TestLeader,
#   TurnstileManagement, Test role — keyin test-user yaratiladi.

export NEST_BASE="http://localhost:8001"
export LARAVEL_BASE="http://localhost:8002"

get_token() {
  case "$1" in
    HR)                    echo "1231487|0cND0qcHGiSc6eh6I21OAPjAtFFG0lUt3EDpEKTPc7d84433" ;;
    Worker)                echo "1231488|rwjV5YofBhYYUwvKbh0lyd3ECCA3PrN4OkeqlmpM9db052a9" ;;
    Admin)                 echo "1231515|H9Ew1reEQgIpxSQEz4Sl9ZsESildERCy4g8qxWd285eb015e" ;;
    Finance)               echo "1231490|Bc98NVu1lpruWyHvFU3T5nIYUjShJk084Sg739bT2d8b556a" ;;
    Economist)             echo "1231491|tm3rlkwj1LAA7uRQGaPlgNcOLUbTc1yPV4SA7x8ub9f41dd4" ;;
    Jurist)                echo "1231492|EmZBQozT54sxAxzvfUUvAGl4htVkQGuFWDHeIhhLee6c066b" ;;
    HrLeader)              echo "1231493|3K9dYq9tKVxiv20FHynwpnQPO0Pg4uonTarXCYnw17924fbe" ;;
    EconomistLeader)       echo "1231494|TWg19EZ39O9BEf95mAOJ1mRchCV3E2wgE2l3sqt396b3401e" ;;
    OrganizationLeader)    echo "1231495|eIUwOl39KqYnDH3AH3mxe6hpFauUMh7HlL48jL3Hf1cead47" ;;
    Hospital)              echo "1231496|tdDj4agzWYZNztvjbMmjv1lGLdVZpMXrNJeHKSLA6a6924f4" ;;
    TurnstileLeader)       echo "1231497|VIltOdpjBtMRsdtRuFHRrSomY3l8PqxL4U3PDhom09fbf491" ;;
    LmsLearningCenter)     echo "1231498|hod1chCZyBexchx29RwH37aQTFGMZ5XIGJWzLXYC3ac79e19" ;;
    TurnstileViewer)       echo "1231499|H1fJGuG8pXr1TUhowsc0GNgc1LC6unTe6kEiNT3d649f78f8" ;;
    EMM)                   echo "1231500|jjWFrlZOjcspJdBfwsEmzR3Ilm2UpEirn51iRNCRf5d91cf7" ;;
    TimesheetHR)           echo "1231501|BmaNFRcSYc7Esm6vk0UbQoxv45bU6HwcRMMVVgxXc039dff3" ;;
    NBT)                   echo "1231502|6vT1iBMdv2RIlUd9ca4EXjADRThS4vJzhN3qdmMTc67a16f1" ;;
    ToshkentMtuIntegration) echo "1231503|IMKtLn3aY1CFlDbkZYr3y82uPqiVfUsnvvUtHA1Kcc0621fc" ;;
    HrViewLeader)          echo "1231504|Yi4FcGRYuOVlhYjEZISvXWJLFboylM41opP6Edefcd706df9" ;;
    EconomistManagement)   echo "1231505|oqPUh6oGo4l7jSAyebEcpHLm9B0Xvx2sAoZKXdLTbe3cb019" ;;
    IKT)                   echo "1231506|AX2TQ6myVdWnHKHK0npaBUEKg1T7iQNhEJ28Thff7f2339b1" ;;
    WorkersView)           echo "1231507|S43s4861I6BySIqyXfvtE6frxXmGKuEtfGsYZ2Hc0d163db0" ;;
    LeaderManagement)      echo "1231508|xzxNvQDQOrJdMBdmjAEQKbGLcuyeC6hH2nvgYWju85df8fae" ;;
    *) echo "" ;;
  esac
}

get_tuser() {
  case "$1" in
    HR) echo 26 ;; Worker) echo 1 ;; Admin) echo 1 ;; Finance) echo 78 ;;
    Economist) echo 41 ;; Jurist) echo 57534 ;; HrLeader) echo 27 ;;
    EconomistLeader) echo 255 ;; OrganizationLeader) echo 14 ;; Hospital) echo 50433 ;;
    TurnstileLeader) echo 4649 ;; LmsLearningCenter) echo 23833 ;; TurnstileViewer) echo 293 ;;
    EMM) echo 12258 ;; TimesheetHR) echo 11 ;; NBT) echo 59898 ;;
    ToshkentMtuIntegration) echo 1245 ;; HrViewLeader) echo 279 ;; EconomistManagement) echo 39 ;;
    IKT) echo 19756 ;; WorkersView) echo 38111 ;; LeaderManagement) echo 1177 ;;
    *) echo "" ;;
  esac
}

# Barcha mavjud role'lar (token bor)
ALL_ROLES="HR Worker Admin Finance Economist Jurist HrLeader EconomistLeader OrganizationLeader Hospital TurnstileLeader LmsLearningCenter TurnstileViewer EMM TimesheetHR NBT ToshkentMtuIntegration HrViewLeader EconomistManagement IKT WorkersView LeaderManagement"
