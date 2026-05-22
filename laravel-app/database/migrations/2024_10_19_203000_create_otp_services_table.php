<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('otp_services', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('key', 20)->index();
            $table->string('url')->nullable();
            $table->json('credentials')->nullable();
            $table->boolean('status')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('otp_services');
    }
};
