<?php

namespace Modules\Economist\Http\Requests\Economist;

use Illuminate\Foundation\Http\FormRequest;

class EconomistRefreshWorkersPinsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:statements,tax-four-applications,tax_four_applications,tax-five-applications,tax_five_applications,pension-payments,pension_payments'],
            'year' => ['required', 'integer', 'min:2010', 'max:2030'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ];
    }
}
