<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('turnstile_schedule_types', static function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->tinyInteger('type')->default(1);
            $table->json('days');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnstile_schedule_types');
    }
};
