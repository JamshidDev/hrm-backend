<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Exam\Enums\TopicFileEnum;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('materials', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_center_id')->constrained('learning_centers')->cascadeOnDelete();
            $table->tinyInteger('type')->default(TopicFileEnum::THREE->value);
            $table->string('file_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
