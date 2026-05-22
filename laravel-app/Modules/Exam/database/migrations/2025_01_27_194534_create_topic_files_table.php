<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('topic_files', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->nullable()->constrained('topics')->cascadeOnDelete();
            $table->string('file')->nullable();
            $table->string('file_extension', 15)->nullable();
            $table->string('file_name')->nullable();
            $table->tinyInteger('type')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('topic_files');
    }
};
