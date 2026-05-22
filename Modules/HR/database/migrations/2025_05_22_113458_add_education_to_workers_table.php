<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\EducationEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('workers', static function (Blueprint $table) {
            $table->tinyInteger('education')
                ->default(EducationEnum::ONE->value)->after('nationality_id')->index();
        });
    }


    public function down(): void
    {
        Schema::table('workers', static function (Blueprint $table) {
            $table->dropindex('workers_education_index');
            $table->dropColumn('education');
        });
    }
};
