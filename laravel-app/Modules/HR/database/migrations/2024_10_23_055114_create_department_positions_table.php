<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\DepartmentCategoryEnum;
use Modules\HR\Enums\EducationEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('department_positions', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete();
            $table->foreignId('position_id')->nullable()->constrained('positions')->cascadeOnDelete();
            $table->integer('sort')->index()->default(1);
            $table->tinyInteger('group')->default(0);
            $table->string('rank', 3)->nullable();
            $table->string('max_rank', 3)->nullable();
            $table->integer('rate')->default(100)->index();
            $table->bigInteger('salary')->nullable();
            $table->integer('experience')->default(0);
            $table->tinyInteger('education')->default(EducationEnum::ONE->value);
            $table->integer('external')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('department_positions');
    }
};
