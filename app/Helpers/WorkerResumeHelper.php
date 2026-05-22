<?php

namespace App\Helpers;

use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\HR\Enums\AcademicDegreeEnum;
use Modules\HR\Enums\AcademicTitleEnum;
use Modules\HR\Enums\PartyEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Enums\EducationEnum;
use PhpOffice\PhpWord\TemplateProcessor;

class WorkerResumeHelper
{
    public static function downloadResume($workerPosition): TemplateProcessor
    {
        $worker = $workerPosition->worker;

        $lang = request('lang', 'latin');

        if ($lang === 'latin') {
            $yearText = '-';
        } else {
            $yearText = ' ';
        }

        $temp = new TemplateProcessor(public_path('resumes/resume/resume_latin.docx'));

        $full_name = TranslateHelper::translate($worker->full_name(), $lang);
        $birth_address = TranslateHelper::translate(($worker->region->name . ', ' . $worker->city->name), $lang);

        $universitiesArray = [];
        $specialitiesArray = [];

        if (count($worker->universities)) {

            foreach ($worker->universities as $university) {
                $u = $university->university;

                if ($u) {
                    $universitiesArray[] = Carbon::parse(
                            $university->to_date
                        )->year . $yearText . 'yil,' . $u->name;

                    $specialitiesArray[] = $university->speciality?->name;
                }
            }

            $universities = implode(', ', $universitiesArray);
            $universities = TranslateHelper::translate($universities, $lang);
            $specialities = implode(', ', $specialitiesArray);
            $specialities = TranslateHelper::translate($specialities, $lang);
        }

        $languageNames = $worker->languages->pluck('name')->toArray();
        $languages = TranslateHelper::translate(implode(',', $languageNames), $lang);

        $type_actions = 'taqdirlanmagan';
        $type_actions = TranslateHelper::translate($type_actions, $lang);

        $old_careers = $worker->old_careers->sortBy('sort');
        $careers = [];
        foreach ($old_careers as $career) {
            $dates = Carbon::parse($career->from_date)->year . '-' . Carbon::parse($career->to_date)->year . ' yy';
            $careers[] = [
                'career_date' => TranslateHelper::translate($dates, $lang),
                'career_name' => TranslateHelper::translate($career->post_name, $lang)
            ];
        }

        $positions = WorkerPosition::query()
            ->where('worker_id', $worker->id)
            ->with(['department', 'organization', 'position', 'contract'])
            ->orderBy('position_date')
            ->get();
        foreach ($positions as $index => $position) {
            $postName = PositionHelper::getFullPosition($position);
            $from = Carbon::parse($position->position_date)->year;

            if ($position->status === PositionStatusEnum::ACTIVE->value) {
                $to = 'h.v';
            } else {
                $nextPosition = $positions[$index + 1] ?? null;
                if ($nextPosition) {
                    $to = Carbon::parse($nextPosition->position_date)->year . ' yy';
                } else {
                    $to = $from;
                }
            }

            $dates = $from . '-' . $to;

            $careers[] = [
                'career_date' => TranslateHelper::translate($dates, $lang),
                'career_name' => TranslateHelper::translate($postName, $lang),
            ];
        }

        $relatives = [];
        foreach ($worker->relatives as $relative) {
            if ($relative->birthday) {
                $birthYear = Carbon::parse($relative->birthday)->year;
                $birthPlace = $birthYear . $yearText . 'yil, ' . $relative->birth_place;
            } else {
                $birthPlace = $relative->birth_place;
            }

            $relatives[] = [
                'relative'            => TranslateHelper::translate(RelativeEnum::get($relative->relative, 'uz'), $lang),
                'relative_full_name'  => TranslateHelper::translate($relative->full_name(), $lang),
                'relative_birth_info' => TranslateHelper::translate($birthPlace, $lang),
                'relative_post_name'  => TranslateHelper::translate($relative->post_name, $lang),
                'relative_address' => TranslateHelper::translate(str_replace(['<', '>'], ' ', $relative->address), $lang)
            ];
        }

        $temp->cloneRowAndSetValues('career_date', $careers);
        $temp->cloneRowAndSetValues('relative', $relatives);
        $temp->setValue('full_name', $full_name);

        $tempImage = tempnam(sys_get_temp_dir(), 'photo') . '.jpg';
        if ($worker->photo && Storage::disk('minio')->exists($worker->photo)) {
            $content = Storage::disk('minio')->get($worker->photo);
            file_put_contents($tempImage, $content);
            $temp->setImageValue('photo', array(
                'path'   => $tempImage,
                'width'  => 113,
                'height' => 149,
                'ratio'  => false
            ));
            unlink($tempImage);
        }

        $birth = Carbon::parse($worker->birthday)->format('d.m.Y');

        $post_name = PositionHelper::getFullPosition($workerPosition);

        $education = EducationEnum::get($worker->education);
        $party = $worker->party ? PartyEnum::get($worker->party->party) : "Yo'q";

        $position_date = Carbon::parse($workerPosition->position_date);

        $positionDate = $position_date->year .
            $yearText . 'yil ' . $position_date->day . $yearText .
            Helper::getMonth($position_date->month) . 'dan';

        $temp->setValue('position_date', TranslateHelper::translate($positionDate, $lang));
        $temp->setValue('full_position_name', TranslateHelper::translate($post_name, $lang));
        $temp->setValue('birthday', $birth);
        $temp->setValue('birth_address', $birth_address);
        $temp->setValue('nationality', TranslateHelper::translate($worker->nationality->name, $lang));
        $temp->setValue('party', TranslateHelper::translate($party, $lang));
        $temp->setValue('education', TranslateHelper::translate($education, $lang));
        $temp->setValue('universities', $universities ?? '');
        $temp->setValue('specialities', $specialities ?? '');
        $academic_degree = self::academic_degree($worker->academic_degree);
        $academic_title = self::academic_title($worker->academic_title);
        $temp->setValue('academic_degree', TranslateHelper::translate($academic_degree, $lang));
        $temp->setValue('academic_title', TranslateHelper::translate($academic_title, $lang));
        $temp->setValue('languages', $languages);
        $temp->setValue('incentives', $type_actions);
        $temp->setValue('military', TranslateHelper::translate($worker->military_rank, $lang));
        $temp->setValue('deputy', TranslateHelper::translate($worker->deputy, $lang));

        return $temp;
    }

    public static function education($educations): int
    {
        if (in_array(EducationEnum::HIGH->value, $educations, true)) {
            return EducationEnum::HIGH->value;
        }
        if (in_array(EducationEnum::MEDIUM_SPECIAL->value, $educations, true)) {
            return EducationEnum::MEDIUM_SPECIAL->value;
        }
        return EducationEnum::MEDIUM->value;
    }

    public static function academic_degree($academic_degree): string
    {
        if ($academic_degree) {
            return AcademicDegreeEnum::get($academic_degree->type);
        }

        return '';
    }

    public static function academic_title($academic_title): string
    {
        if ($academic_title) {
            return AcademicTitleEnum::get($academic_title->type);
        }

        return '';
    }

}
