<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Modules\Economist\Models\PensionPaymentAggregate;
use Modules\Economist\Models\StatementAggregate;
use Modules\Economist\Models\TaxFiveAggregate;
use Modules\Economist\Models\TaxFourAggregate;

class DashboardController extends Controller
{

    public function index(): JsonResponse
    {
        $user = auth()->user();
        $carbonDate = Carbon::parse(request('year', date('Y')) . '-' . request('month', date('m')) . '-01');

        $periods = collect();
        for ($i = 0; $i < 8; $i++) {
            $date = (clone $carbonDate)->subMonths($i);
            $periods->push([
                'year' => $date->year,
                'month' => $date->month,
                'label' => $date->format('Y-m')
            ]);
        }

        $statements = StatementAggregate::lastMonthsTotal($user, $periods);
        $tax_four = TaxFourAggregate::lastMonthsTotal($user, $periods);
        $tax_five = TaxFiveAggregate::lastMonthsTotal($user, $periods);
        $pension_payments = PensionPaymentAggregate::lastMonthsTotal($user, $periods);

        $lastStatement = $statements[0];
        $lastTaxFour = $tax_four[0];
        $lastTaxFive = $tax_five[0];
        $lastPensionPayment = $pension_payments[0];


        return Helper::response(true, [
            'statements' => $statements,
            'tax_four' => $tax_four,
            'tax_five' => $tax_five,
            'last_month' => [
                'statement' => [
                    [
                        'key' => 'total_one',
                        'name' => trans('messages.economist.statement.total_one'),
                        'value' => $lastStatement['amount']['total_one'] ?? 0
                    ],
                    [
                        'key' => 'total_two',
                        'name' => trans('messages.economist.statement.total_two'),
                        'value' => $lastStatement['amount']['total_two'] ?? 0
                    ],
                    [
                        'key' => 'total_three',
                        'name' => trans('messages.economist.statement.total_three'),
                        'value' => $lastStatement['amount']['total_three'] ?? 0
                    ],
                    [
                        'key' => 'total_four',
                        'name' => trans('messages.economist.statement.total_four'),
                        'value' => $lastStatement['amount']['total_four'] ?? 0
                    ],
                    [
                        'key' => 'total_five',
                        'name' => trans('messages.economist.statement.total_five'),
                        'value' => $lastStatement['amount']['total_five'] ?? 0
                    ]
                ],
                'tax_five' => [
                    [
                        'key' => 'reported_income',
                        'value' => (int)($lastTaxFive['amount']['reported_income'] ?? 0),
                        'name' => trans('messages.economist.tax_five.reported_income')
                    ],
                    [
                        'key' => 'reported_tax',
                        'value' => (int)($lastTaxFive['amount']['reported_tax'] ?? 0),
                        'name' => trans('messages.economist.tax_five.reported_tax')
                    ],
                ],
                'tax_four' => [
                    [
                        'key' => 'reported_salary_income',
                        'value' => (int)($lastTaxFour['amount']['reported_salary_income'] ?? 0),
                        'name' => trans('messages.economist.tax_four.reported_salary_income')
                    ],
                    [
                        'key' => 'reported_tax',
                        'value' => (int)($lastTaxFour['amount']['reported_tax'] ?? 0),
                        'name' => trans('messages.economist.tax_four.reported_tax')
                    ]
                ],
                'pension_payment' => [
                    [
                        'key' => 'income_tax_paid',
                        'value' => (int)($lastPensionPayment['amount']['income_tax_paid'] ?? 0),
                        'name' => trans('messages.economist.pension_payment.income_tax_paid')
                    ],
                    [
                        'key' => 'total_contributions',
                        'value' => (int)($lastPensionPayment['amount']['total_contributions'] ?? 0),
                        'name' => trans('messages.economist.pension_payment.total_contributions')
                    ]
                ],
            ],
        ]);
    }

}
