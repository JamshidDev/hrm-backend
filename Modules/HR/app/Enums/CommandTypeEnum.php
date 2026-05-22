<?php

namespace Modules\HR\Enums;

enum CommandTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;

    case TWENTY_ONE = 21;
    case TWENTY_TWO = 22;
    case TWENTY_THREE = 23;
    case TWENTY_FOUR = 24;
    case TWENTY_FIVE = 25;

    case THIRTY_ONE = 31;
    case THIRTY_TWO = 32;
    case THIRTY_THREE = 33;
    case THIRTY_FOUR = 34;
    case THIRTY_FIVE = 35;
    case THIRTY_SIX = 36;
    case THIRTY_SEVEN = 37;
    case THIRTY_EIGHT = 38;
    case THIRTY_NINE = 39;

    case FORTY_ONE = 41;
    case FORTY_TWO = 42;
    case FORTY_THREE = 43;
    case FORTY_FOUR = 44;
    case FORTY_FIVE = 45;
    case FORTY_SIX = 46;
    case FORTY_SEVEN = 47;
    case FORTY_EIGHT = 48;
    case FORTY_NINE = 49;
    case FIFTY = 50;
    case FIFTY_ONE = 51;
    case FIFTY_TWO = 52;
    case FIFTY_THREE = 53;
    case FIFTY_FOUR = 54;
    case FIFTY_FIVE = 55;
    case SIXTY_ONE = 61;
    case SIXTY_TWO = 62;
    case SEVENTY_ONE = 71;
    case SEVENTY_TWO = 72;
    case SEVENTY_THREE = 73;

    public static function all(): array
    {
        return array_map(static fn($case) => $case->value, self::cases());
    }

    public static function list(): array
    {
        return array_map(static fn($case) => ['id' => $case->value, 'name' => $case->label()], self::cases());
    }

    public static function isManyType($type): bool
    {
        return in_array($type, self::commandManyTypes(), true);
    }

    public function label(): string
    {
        return trans(
            match ($this) {
                self::ONE => 'messages.command.employment.position_assignment',
                self::TWO => 'messages.command.employment.indefinite_hiring',
                self::THREE => 'messages.command.employment.fixed_term_hiring',
                self::FOUR => 'messages.command.employment.competitive_hiring',
                self::FIVE => 'messages.command.employment.position_commencement',
                self::SIX => 'messages.command.employment.temporary_replacement',
                self::SEVEN => 'messages.command.employment.part_time_hiring',
                self::EIGHT => 'messages.command.employment.reinstatement',

                self::TWENTY_ONE => 'messages.command.transfer.job_transfer',
                self::TWENTY_TWO => 'messages.command.transfer.relocation_due_to_employer',
                self::TWENTY_THREE => 'messages.command.transfer.temporary_assignment',
                self::TWENTY_FOUR => 'messages.command.transfer.contractual_location_change',
                self::TWENTY_FIVE => 'messages.command.transfer.working_conditions_change',

                self::THIRTY_ONE => 'messages.command.termination.mutual_agreement',
                self::THIRTY_TWO => 'messages.command.termination.contract_expiry',
                self::THIRTY_THREE => 'messages.command.termination.employee_initiative',
                self::THIRTY_FOUR => 'messages.command.termination.employer_initiative',
                self::THIRTY_FIVE => 'messages.command.termination.refusal_to_continue',
                self::THIRTY_SIX => 'messages.command.termination.refusal_new_conditions',
                self::THIRTY_SEVEN => 'messages.command.termination.refusal_relocation',
                self::THIRTY_EIGHT => 'messages.command.termination.medical_reasons',
                self::THIRTY_NINE => 'messages.command.termination.force_manure',

                self::FORTY_ONE => 'messages.command.vacation.granting_leave',
                self::FORTY_TWO => 'messages.command.vacation.rescheduling_leave',
                self::FORTY_THREE => 'messages.command.vacation.extending_leave',
                self::FORTY_FOUR => 'messages.command.vacation.recalling_from_leave',
                self::FORTY_SIX => 'messages.command.vacation.splitting_leave',
                self::FORTY_SEVEN => 'messages.command.vacation.additional_paid_leave',
                self::FORTY_EIGHT => 'messages.command.vacation.maternity_leave',
                self::FORTY_NINE => 'messages.command.vacation.childcare_leave_2',
                self::FORTY_FIVE => 'messages.command.vacation.childcare_leave_3',
                self::FIFTY => 'messages.command.vacation.early_return_childcare',
                self::FIFTY_ONE => 'messages.command.vacation.creative_leave',
                self::FIFTY_TWO => 'messages.command.vacation.study_leave',
                self::FIFTY_THREE => 'messages.command.vacation.partial_paid_leave',
                self::FIFTY_FOUR => 'messages.command.vacation.fully_paid_leave',
                self::FIFTY_FIVE => 'messages.command.vacation.unpaid_leave',

                self::SIXTY_ONE => 'messages.command.business_trip.sixty_one',
                self::SIXTY_TWO => 'messages.command.business_trip.sixty_two',

                self::SEVENTY_ONE => 'messages.command.others.seventy_one',
                self::SEVENTY_TWO => 'messages.command.others.seventy_two',
                self::SEVENTY_THREE => 'messages.command.others.seventy_three',
            }
        );
    }

    public static function endedCommandTypes(): array
    {
        return [
            self::THIRTY_ONE->value,
            self::THIRTY_TWO->value,
            self::THIRTY_THREE->value,
            self::THIRTY_FOUR->value,
            self::THIRTY_FIVE->value,
            self::THIRTY_SIX->value,
            self::THIRTY_SEVEN->value,
            self::THIRTY_EIGHT->value,
            self::THIRTY_NINE->value
        ];

    }

    public static function commandManyTypes(): array
    {
        return collect([
            self::FORTY_ONE,
            self::SIXTY_ONE,
            self::SIXTY_TWO,
            self::SEVENTY_ONE,
            self::SEVENTY_TWO,
            self::SEVENTY_THREE,
            self::FIFTY_FIVE,
        ])->map(fn($enum) => $enum->value)->toArray();
    }

    public static function getCommandTypes($contractAdditionalType): array
    {
        return match ($contractAdditionalType) {
            ContractAdditionalTypeEnum::ONE->value => [
                [
                    'id'   => self::TWENTY_FIVE->value,
                    'name' => self::TWENTY_FIVE->label()
                ]
            ],
            ContractAdditionalTypeEnum::EIGHT->value => [
                [
                    'id'   => self::TWENTY_ONE->value,
                    'name' => self::TWENTY_ONE->label()
                ]
            ],
            ContractAdditionalTypeEnum::THIRTEEN->value => [
                [
                    'id'   => self::THIRTY_ONE->value,
                    'name' => self::THIRTY_ONE->label()
                ]
            ],
            default => collect([
                self::THIRTY_TWO,
                self::THIRTY_THREE,
                self::THIRTY_FOUR,
                self::THIRTY_FIVE,
                self::THIRTY_SIX,
                self::THIRTY_SEVEN,
                self::THIRTY_EIGHT,
                self::THIRTY_NINE,
                self::FORTY_ONE,
                self::FORTY_TWO,
                self::FORTY_THREE,
                self::FORTY_FOUR,
                self::FORTY_FIVE,
                self::FORTY_SIX,
                self::FORTY_SEVEN,
                self::FORTY_EIGHT,
                self::FORTY_NINE,
                self::FIFTY,
                self::FIFTY_ONE,
                self::FIFTY_TWO,
                self::FIFTY_THREE,
                self::FIFTY_FOUR,
                self::FIFTY_FIVE,
                self::SIXTY_ONE,
                self::SIXTY_TWO,
                self::SEVENTY_ONE,
                self::SEVENTY_TWO,
                self::SEVENTY_THREE
            ])->map(fn($enum) => ['id' => $enum->value, 'name' => $enum->label()])->toArray()
        };
    }

    public static function getContractCommands($type): array
    {
        return match ($type) {
            ContractTypeEnum::ONE->value => [
                [
                    'id'   => self::TWO->value,
                    'name' => self::TWO->label()
                ]
            ],
            ContractTypeEnum::SIX->value => [
                [
                    'id'   => self::THREE->value,
                    'name' => self::THREE->label()
                ],
                [
                    'id'   => self::SIX->value,
                    'name' => self::SIX->label()
                ]
            ],
            ContractTypeEnum::THREE->value => [
                [
                    'id'   => self::SEVEN->value,
                    'name' => self::SEVEN->label()
                ]
            ],
            ContractTypeEnum::FOUR->value, ContractTypeEnum::FIVE->value => [
                [
                    'id'   => self::THREE->value,
                    'name' => self::THREE->label()
                ]
            ],
            default => []
        };
    }
}
