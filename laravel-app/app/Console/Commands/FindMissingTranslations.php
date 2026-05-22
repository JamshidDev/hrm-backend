<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class FindMissingTranslations extends Command
{
    protected $signature = 'lang:missing';
    protected $description = 'Command description';

    public function handle(): int
    {
        $this->info("Scanning project for translation keys...");
        $files = File::allFiles(base_path());

        $usedKeys = [];

        foreach ($files as $file) {
            if ($file->getExtension() === 'php') {
                $content = file_get_contents($file->getRealPath());

                preg_match_all("/__\(['\"]([^'\"]+)['\"]\)/", $content, $matches1);
                preg_match_all("/trans\(['\"]([^'\"]+)['\"]\)/", $content, $matches2);

                $keys = array_merge($matches1[1], $matches2[1]);
                $usedKeys = $keys;
            }
        }

        $usedKeys = array_unique($usedKeys);
        sort($usedKeys);

        $langFile = lang_path('en/messages.php');

        if (!File::exists($langFile)) {
            $this->error("messages.php not found at $langFile");
            return 1;
        }

        $translations = require $langFile;
        $flatTranslations = $this->flattenArray($translations);

        $missing = [];
        foreach ($usedKeys as $key) {
            if (!array_key_exists($key, $flatTranslations)) {
                $missing[] = $key;
            }
        }

        if (count($missing)) {
            $this->warn("🚨 Missing translation keys:");
            foreach ($missing as $key) {
                $this->line(" - $key");
            }
        } else {
            $this->info("Hammasi joyida! Hech narsa yo‘qolmagan.");
        }

        return 0;
    }

    private function flattenArray(array $array, string $prefix = ''): array
    {
        $result = [];
        foreach ($array as $key => $value) {
            $newKey = $prefix ? "$prefix.$key" : $key;
            if (is_array($value)) {
                $result += $this->flattenArray($value, $newKey);
            } else {
                $result[$newKey] = $value;
            }
        }
        return $result;
    }
}
