<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\HR\Enums\AcademicDegreeEnum;
use Modules\HR\Enums\AcademicTitleEnum;
use Modules\HR\Enums\CommandReasonTypeEnum;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Enums\ConfirmationWorkerLevelEnum;
use Modules\HR\Enums\ContractAdditionalTypeEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\DepartmentCategoryEnum;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\FinancialAssistanceEnum;
use Modules\HR\Enums\FineTypeEnum;
use Modules\HR\Enums\FinishedCommandTypeEnum;
use Modules\HR\Enums\GiftTypeEnum;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Enums\MilitaryStatusEnum;
use Modules\HR\Enums\OrganizationDocumentTypeEnum;
use Modules\HR\Enums\PartyEnum;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Enums\UniversityTypeEnum;
use Modules\HR\Enums\VacationAdditionalEnum;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Enums\WorkerApplicationTypeEnum;
use Modules\HR\Transformers\Worker\LanguageResource;
use Modules\Structure\Enums\RolesEnum;
use Modules\Structure\Models\Language;
use Modules\Vacancy\Enums\VacancyFileTypesEnum;

class HRController extends Controller
{

    public function enums(): JsonResponse
    {
        $user = auth()->user();
        return Helper::response(true, [
            'academic_titles'             => AcademicTitleEnum::list(),
            'academic_degrees'            => AcademicDegreeEnum::list(),
            'parties'                     => PartyEnum::list(),
            'educations'                  => EducationEnum::list(),
            'contract_types'              => ContractTypeEnum::list(),
            'groups'                      => Helper::groups(),
            'ranks'                       => Helper::ranks(),
            'probation_list'              => ProbationEnum::list(),
            'relatives'                   => RelativeEnum::list(null),
            'marital_statuses'            => MaritalStatusEnum::list(),
            'languages'                   => LanguageResource::collection(Language::get()),
            'university_types'            => UniversityTypeEnum::list(),
            'military_statuses'           => MilitaryStatusEnum::list(),
            'confirmation_worker'         => ConfirmationWorkerLevelEnum::list(),
            'contract_application_types'  => ContractTypeEnum::getApplicationTypes(),
            'create_application_types'    => WorkerApplicationTypeEnum::list(),
            'staff_categories'            => DepartmentCategoryEnum::list(),
            'vacation_additional'         => VacationAdditionalEnum::list(),
            'finished_command_types'      => FinishedCommandTypeEnum::list(),
            'med_statuses'                => MedStatusEnum::list(),
            'organization_document_types' => OrganizationDocumentTypeEnum::list(),
            'roles' => RolesEnum::userRoles($user),
            'gift_types'                  => GiftTypeEnum::list(),
            'fine_types'                  => FineTypeEnum::list(),
            'financial_assistance'        => FinancialAssistanceEnum::list(),
            'vacation_types' => VacationTypeEnum::list(),
            'work_types' => [
                [
                    'id' => 1,
                    'name' => "To'liq"
                ]
            ],
            'command_additional' => [
                'delete_additional' => [
                    'pension_count' => trans('messages.document.commands.command_additional.delete_additional.pension_count'),
                    'pension_coefficient' => trans('messages.document.commands.command_additional.delete_additional.pension_coefficient'),
                    'salary_withholding' => trans('messages.document.commands.command_additional.delete_additional.salary_withholding'),
                    'compensation' => trans('messages.document.commands.command_additional.delete_additional.compensation')
                ]
            ],
            'vacancy_file_types' => VacancyFileTypesEnum::list()
        ]);
    }

    public function contractAdditionalTypes(Request $request): JsonResponse
    {
        $data = ContractAdditionalTypeEnum::getByContractAdditionalTypes($request->contract_type);
        return Helper::response(true, $data);
    }

    public function getCommandTypes(Request $request): ?JsonResponse
    {
        if ($request->status === ModelTypeEnum::CONTRACTS->value) {
            return Helper::response(true, CommandTypeEnum::getContractCommands((int)$request->type));
        }

        $types = CommandTypeEnum::getCommandTypes((int)$request->type);
        return Helper::response(true, $types);
    }

    public function getReasonTypes(Request $request): ?JsonResponse
    {
        $types = CommandReasonTypeEnum::getReasonTypes((int)$request->type);
        return Helper::response(true, $types);
    }

}
