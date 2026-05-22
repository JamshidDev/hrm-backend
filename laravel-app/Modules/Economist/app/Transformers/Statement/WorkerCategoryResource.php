<?php

namespace Modules\Economist\Transformers\Statement;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $totalWorker = $this->external_worker_count + $this->capital_society_worker_count + $this->capital_own_use_worker_count
            + $this->capital_foreign_company_worker_count + $this->construction_society_worker_count + $this->construction_own_use_worker_count
            + $this->construction_foreign_company_worker_count + $this->other_society_worker_count + $this->other_own_use_worker_count +
            $this->other_foreign_company_worker_count;

        $totalSalary = $this->external_salary_fund + $this->capital_society_salary_fund + $this->capital_own_use_salary_fund
            + $this->capital_foreign_company_salary_fund + $this->construction_society_salary_fund + $this->construction_own_use_salary_fund
            + $this->construction_foreign_company_salary_fund + $this->other_society_salary_fund + $this->other_own_use_salary_fund +
            $this->other_foreign_company_salary_fund;

        return [
            'id'                                        => $this->id,
            'year'                                      => $this->year,
            'month'                                     => $this->month,
            'external_worker_count'                     => number_format($this->external_worker_count),
            'external_salary_fund'                      => number_format($this->external_salary_fund, 2, '.', ' '),
            'capital_society_worker_count'              => number_format($this->capital_society_worker_count),
            'capital_society_salary_fund'               => number_format(
                $this->capital_society_salary_fund,
                2,
                '.',
                ' '
            ),
            'capital_own_use_worker_count'              => number_format($this->capital_own_use_worker_count),
            'capital_own_use_salary_fund'               => number_format(
                $this->capital_own_use_salary_fund,
                2,
                '.',
                ' '
            ),
            'capital_foreign_company_worker_count'      => number_format($this->capital_foreign_company_worker_count),
            'capital_foreign_company_salary_fund'       => number_format(
                $this->capital_foreign_company_salary_fund,
                2,
                '.',
                ' '
            ),
            'construction_society_worker_count'         => number_format($this->construction_society_worker_count),
            'construction_society_salary_fund'          => number_format(
                $this->construction_society_salary_fund,
                2,
                '.',
                ' '
            ),
            'construction_own_use_worker_count'         => number_format($this->construction_own_use_worker_count),
            'construction_own_use_salary_fund'          => number_format(
                $this->construction_own_use_salary_fund,
                2,
                '.',
                ' '
            ),
            'construction_foreign_company_worker_count' => number_format(
                $this->construction_foreign_company_worker_count
            ),
            'construction_foreign_company_salary_fund'  => number_format(
                $this->construction_foreign_company_salary_fund,
                2,
                '.',
                ' '
            ),
            'other_society_worker_count'                => number_format($this->other_society_worker_count),
            'other_society_salary_fund'                 => number_format($this->other_society_salary_fund, 2, '.', ' '),
            'other_own_use_worker_count'                => number_format($this->other_own_use_worker_count),
            'other_own_use_salary_fund'                 => number_format($this->other_own_use_salary_fund, 2, '.', ' '),
            'other_foreign_company_worker_count'        => number_format($this->other_foreign_company_worker_count),
            'other_foreign_company_salary_fund'         => number_format(
                $this->other_foreign_company_salary_fund,
                2,
                '.',
                ' '
            ),
            'temporary_contract_worker_count'           => number_format($this->temporary_contract_worker_count),
            'temporary_contract_salary_fund'            => number_format(
                $this->temporary_contract_salary_fund,
                2,
                '.',
                ' '
            ),
            'civil_contract_worker_count'               => number_format($this->civil_contract_worker_count),
            'civil_contract_salary_fund'                => number_format(
                $this->civil_contract_salary_fund,
                2,
                '.',
                ' '
            ),
            'freelancer_worker_count'                   => number_format($this->freelancer_worker_count),
            'freelancer_salary_fund'                    => number_format($this->freelancer_salary_fund, 2, '.', ' '),
            'result_worker_count'                       => number_format($totalWorker),
            'result_salary_fund'                        => number_format($totalSalary, 2, '.', ' '),
        ];
    }

}
