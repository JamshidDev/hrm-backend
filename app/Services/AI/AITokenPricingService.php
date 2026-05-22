<?php

namespace App\Services\AI;

class AITokenPricingService
{
    private const string DEFAULT_MODEL = 'gpt-4o';
    private const int CHARS_PER_TOKEN = 4;
    private const int PRICE_DIVISOR = 1000;
    private const int PRICE_PRECISION = 5;

    private const array PRICES = [
        'gpt-4o' => ['input' => 0.005, 'output' => 0.015],
        'gpt-4' => ['input' => 0.03, 'output' => 0.06],
        'gpt-4-turbo' => ['input' => 0.01, 'output' => 0.03],
        'gpt-3.5-turbo' => ['input' => 0.0005, 'output' => 0.0015],
    ];

    public function estimateTokens(string $text): float
    {
        return strlen($text) / self::CHARS_PER_TOKEN;
    }

    public function calculateCost(int|float $inputTokens, int|float $outputTokens, string $model = self::DEFAULT_MODEL): float
    {
        $price = self::PRICES[$model] ?? self::PRICES[self::DEFAULT_MODEL];

        return round(
            ($inputTokens * $price['input'] + $outputTokens * $price['output']) / self::PRICE_DIVISOR,
            self::PRICE_PRECISION
        );
    }
}
