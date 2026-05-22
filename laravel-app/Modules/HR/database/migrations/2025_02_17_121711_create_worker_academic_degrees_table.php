<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\AcademicDegreeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_academic_degrees', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers');
            $table->tinyInteger('type')->default(AcademicDegreeEnum::TWO->value);
            $table->string('file')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_academic_degrees');
    }
};
