<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\UniversityTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_universities', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->foreignId('university_id')->nullable()->constrained('universities');
            $table->foreignId('speciality_id')->nullable()->constrained('specialities');
            $table->integer('sort')->index()->default(1);
            $table->date('from_date')->nullable();
            $table->date('to_date')->nullable();
            $table->string('number', 20)->nullable();
            $table->date('diploma')->nullable();
            $table->integer('experience')->default(0);
            $table->string('file')->nullable();
            $table->boolean('current')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_universities');
    }
};
