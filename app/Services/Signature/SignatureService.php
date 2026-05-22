<?php

namespace App\Services\Signature;

use RuntimeException;

class SignatureService
{
    /**
     * Asosiy public metod
     */
    public function generate(
        string $siteId,
        string $documentId,
        string $fileBinary
    ): array {
        // GOST hash - lowercase qaytaradi
        $hash = $this->gostHash($fileBinary);

        // ⚠️ MUHIM: siteId va documentId ni ORIGINAL holatda qoldirish!
        // strtolower FAQAT CRC32 hisoblash uchun kerak bo'lishi mumkin
        $qrBody = $siteId . $documentId . $hash;

        $crc32 = $this->crc32FromHex($qrBody);

        $qrCode = $qrBody . $crc32;

        return [
            'hash'      => $hash,
            'crc32'     => $crc32,
            'qr_code'   => $qrCode,
            'deep_link' => 'eimzo://sign?qc=' . $qrCode,
        ];
    }

    /**
     * O'zDSt 1106:2009 (GOST R 34.11-94 CryptoPro)
     */
    private function gostHash(string $binary): string
    {
        if (!in_array('gost-crypto', hash_algos(), true)) {
            throw new RuntimeException('gost-crypto algoritmi PHP da mavjud emas');
        }

        return hash('gost-crypto', $binary);  // lowercase hex qaytaradi
    }

    /**
     * CRC32 — HEX BYTES dan hisoblash
     */
    private function crc32FromHex(string $hex): string
    {
        if (strlen($hex) % 2 !== 0) {
            throw new RuntimeException('Hex string noto\'g\'ri');
        }

        $binary = hex2bin(strtolower($hex));  // hex2bin uchun lowercase kerak

        $crc = crc32($binary);

        return sprintf('%08x', $crc & 0xFFFFFFFF);
    }
}
