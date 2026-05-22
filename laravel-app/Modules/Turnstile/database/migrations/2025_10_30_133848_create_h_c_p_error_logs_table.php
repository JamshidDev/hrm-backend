<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('h_c_p_error_logs', static function (Blueprint $table) {
            $table->id();
            $table->bigInteger('time')->unique();
            $table->string('path')->nullable();
            $table->boolean('status')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('h_c_p_error_logs');
    }
};
