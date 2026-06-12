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
    HR)                    echo "1231463|lu02HXgnrOkUfDTV3FKkN7zf9QbnFwQYPPhdBn7E12bc92e2" ;;
    Worker)                echo "1231464|dm7IAJ9z3FoHmYnvM2RbveSC34Ngn3v9d5PYLVkHeefcb417" ;;
    Admin)                 echo "1231465|cu3W0RvLdxM0N2ayE6IfjFx4QIXmgkUOcneeyOd6b4313f54" ;;
    Finance)               echo "1231466|q6xq2idVJo7LA9D3xnm6jNCG9MlnmxVtpjwkzCSXa79d74b6" ;;
    Economist)             echo "1231467|i0JtTs0MDGArQdLKz757EnPqO40TD2PZIksfJ6Xd3428ac56" ;;
    Jurist)                echo "1231468|ZiXRhrINlmEdMtIGEnopmfQAnKLeJk30vThlI78g9c334eea" ;;
    HrLeader)              echo "1231469|vSRfqNqM4eqcJhWMLIaiVgTio321YIffJvjTVvyLec91b61a" ;;
    EconomistLeader)       echo "1231470|sdA3LvUTSYrOQ6GNCOHaVtHZgn7nmqCafzo4q5HPbce82037" ;;
    OrganizationLeader)    echo "1231471|07v6Umlf45Bmf9xpQOg4XTn2saev3vg321ap935a4f3f480f" ;;
    Hospital)              echo "1231472|mp1pjY1qYdF86xwjeY0IfuyI7HFip7HyCK1xmAHif981d4c4" ;;
    TurnstileLeader)       echo "1231473|jtwBwBZXOYml1d2SVCpr78iI7a5KECMWe2Jitw3gb506a417" ;;
    LmsLearningCenter)     echo "1231474|bBhJ9lDl2TUK9rxJDHVCQo0AiooepxirLkJtBG63d7478abd" ;;
    TurnstileViewer)       echo "1231475|DcNY0Yls93TK1KeycLpA0ztDqxl6kMd1GRcPOWSc4d6e6b1a" ;;
    EMM)                   echo "1231476|lMt6hzTtyH3f8uqMwUlM4RjWhBVLGn1yPgmlmWPmf9af862b" ;;
    TimesheetHR)           echo "1231477|PKcbHIVsnF7NrzTg0jAZdd0iQ6QpcC5t5YfioQPv77446bd1" ;;
    NBT)                   echo "1231478|Uf5xZCCV1Mk8Ii31nFsOajlC9yd6mXIUItaGyYv6edc79ee6" ;;
    ToshkentMtuIntegration) echo "1231479|pqH2Eg69EvKnM89eI3DMXgHzuYhCr7SVbEzkxVox874fddc9" ;;
    HrViewLeader)          echo "1231480|EyYBf3GbGjk6oD2Z884nQwTpNUMF1H6rqLXWMwyI3757f6d8" ;;
    EconomistManagement)   echo "1231481|aW1xqR653AKgeTDIF2ur8es7AQYxipVs3FzALi9cb8f7a17a" ;;
    IKT)                   echo "1231482|dSMxfjCQCA6M7CtBzUnJbQ6HdZmEI5JVg3T4ZQ9526f5c8fa" ;;
    WorkersView)           echo "1231483|AocnqeIO1Rh9Hez0hY1Lh9jQhmLvEd6USYwvOwGL8af006ee" ;;
    LeaderManagement)      echo "1231484|5NyZQzgGKDlsrCPoxdz7Frl7ojUqIdn41UnfsbBQ78c6ad45" ;;
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
