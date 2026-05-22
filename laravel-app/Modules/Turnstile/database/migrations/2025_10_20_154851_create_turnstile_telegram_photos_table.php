<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('turnstile_telegram_photos', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('worker_id')->constrained('workers');
            $table->bigInteger('hcp_person_id')->nullable();
            $table->string('photo');
            $table->tinyInteger('status')->default(1);
            $table->text('error')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('turnstile_telegram_photos');
    }
};
