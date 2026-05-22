<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('liveness_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('status', 10)
                ->default('started')
                ->index();

            $table->boolean('success')->default(false);
            $table->timestamps();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('liveness_sessions');
    }
};
