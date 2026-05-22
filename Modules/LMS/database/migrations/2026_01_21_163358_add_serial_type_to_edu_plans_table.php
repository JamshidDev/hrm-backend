<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('edu_plans', function (Blueprint $table) {
            $table->tinyInteger('serial')->default(\Modules\LMS\Enums\SerialTypeEnum::ONE->value);
        });
    }


    public function down(): void
    {
        Schema::table('edu_plans', function (Blueprint $table) {
            $table->dropColumn('serial');
        });
    }
};
