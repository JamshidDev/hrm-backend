<?php

namespace Modules\Structure\Enums;

enum RolesEnum: string
{
    case WORKER = 'Worker';

    case HR = 'HR';
    case FINANCE = 'Finance';
    case JURIST = 'Jurist';
    case ECONOMIST = 'Economist';

    case HrLeader = 'HrLeader';
    case EconomistLeader = 'EconomistLeader';
    case Hospital = 'Hospital';
    case TurnstileViewer = 'TurnstileViewer';
    case TurnstileLeader = 'TurnstileLeader';

    public static function all(): array
    {
        return array_combine(
            array_map(static fn($case) => $case->value, self::cases()),
            array_map(static fn($case) => $case->label(), self::cases())
        );
    }

    public static function userRoles($user): array
    {
        if ($user->hasRole('Admin')) {
            return self::list();
        }
        return collect([
            self::WORKER,
            self::HR,
            self::TurnstileViewer,
        ])->map(fn($enum) => ['id' => $enum->value, 'name' => $enum->label()])->toArray();
    }

    public function label(): string
    {
        return match ($this) {
            self::WORKER => trans('messages.roles.worker'),
            self::HR => trans('messages.roles.hr'),
            self::FINANCE => trans('messages.roles.finance'),
            self::JURIST => trans('messages.roles.jurist'),
            self::ECONOMIST => trans('messages.roles.economist'),
            self::HrLeader => trans('messages.roles.hr_leader'),
            self::EconomistLeader => trans('messages.roles.economist_leader'),
            self::Hospital => trans('messages.roles.hospital'),
            self::TurnstileViewer => trans('messages.roles.turnstile_viewer'),
            self::TurnstileLeader => trans('messages.roles.turnstile_leader'),
        };
    }

    public static function get(int $key): string
    {
        return self::tryFrom($key)?->label() ?? "";
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}
