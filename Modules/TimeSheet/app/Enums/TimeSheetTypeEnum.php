<?php

namespace Modules\TimeSheet\Enums;

use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Models\Vacation;

enum TimeSheetTypeEnum: int
{
    case YA = 1;
    case N = 2;
    case RP = 3;
    case S = 5;
    case K = 10;
    case OT = 14;
    case OD = 15;
    case U = 16;
    case UV = 17;
    case UD = 18;
    case R = 19;
    case OCH = 20;
    case OJ = 21;
    case DO = 22;
    case OZ = 24;
    case B = 25;
    case T = 26;
    case LCH = 27;
    case VP = 28;
    case G = 29;
    case PR = 31;
    case NS = 32;
    case V = 33;
    case ZB = 34;
    case NN = 35;

    public function label(): string
    {
        return trans(
            match ($this) {
                self::YA => 'messages.work.hours.daytime_evening',
                self::N => 'messages.work.hours.night',
                self::RP => 'messages.work.hours.weekend_holiday',
                self::S => 'messages.work.hours.overtime',
                self::K => 'messages.work.trip.business',
                self::OT => 'messages.work.leave.annual_paid',
                self::OD => 'messages.work.leave.additional_paid',
                self::U => 'messages.work.leave.study_paid',
                self::UV => 'messages.work.hours.reduced_for_students',
                self::UD => 'messages.work.leave.unpaid_study',
                self::R => 'messages.work.leave.maternity',
                self::OCH => 'messages.work.leave.partial_childcare',
                self::OJ => 'messages.work.leave.unpaid_childcare',
                self::DO => 'messages.work.leave.unpaid_admin_permission',
                self::OZ => 'messages.work.leave.unpaid_legal',
                self::B => 'messages.work.disability.temporary',
                self::T => 'messages.work.disability.unpaid',
                self::LCH => 'messages.work.hours.reduced_by_law',
                self::VP => 'messages.work.downtime.not_workers_fault',
                self::G => 'messages.work.absence.full_day_legal',
                self::PR => 'messages.work.absence.unexcused',
                self::NS => 'messages.work.hours.unworked_admin',
                self::V => 'messages.work.days.official_holiday',
                self::ZB => 'messages.work.strike.legal',
                self::NN => 'messages.work.absence.unclear',
            }
        );
    }

    public static function getKeyFromVacationType($vacationType): string
    {
        return match ($vacationType) {
            default => self::key(self::OT->value),
        };
    }

    public static function all(): array
    {
        return array_map(static fn($case) => [
            'id'    => $case->value,
            'name'  => $case->label(),
            'key'   => self::key($case->value),
            'hours' => in_array($case, [self::YA, self::N, self::RP, self::S, self::UV, self::LCH, self::NS]),
        ], self::cases());
    }

    public static function key($key): string
    {
        return match ($key) {
            self::YA->value => 'K',
            self::N->value => 'T',
            self::RP->value => 'РП',
            self::S->value => 'С',
            self::K->value => 'К',
            self::OT->value => 'MT',
            self::OD->value => 'ОД',
            self::U->value => 'У',
            self::UV->value => 'УВ',
            self::UD->value => 'УД',
            self::R->value => 'Р',
            self::OCH->value => 'ОЧ',
            self::OJ->value => 'ОЖ',
            self::DO->value => 'ДО',
            self::OZ->value => 'ОЗ',
            self::B->value => 'Б',
            self::T->value => 'Т',
            self::LCH->value => 'ЛЧ',
            self::VP->value => 'ВП',
            self::G->value => 'Г',
            self::PR->value => 'ПР',
            self::NS->value => 'НС',
            self::V->value => 'D',
            self::ZB->value => 'ЗБ',
            self::NN->value => 'НН'
        };
    }

    public static function get($key): ?array
    {
        return collect(self::all())->firstWhere('id', $key);
    }

    public static function list(): array
    {
        return array_values(self::all());
    }
}
