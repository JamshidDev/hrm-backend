<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_participants', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')
                ->constrained('lessons')
                ->cascadeOnDelete();
            $table->foreignId('worker_id')
                ->constrained('workers')
                ->cascadeOnDelete();
            $table->bigInteger('meeting_id')->nullable();
            $table->dateTime('joined_at');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_participants');
    }
};
