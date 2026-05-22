<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('signature_urls', static function (Blueprint $table) {
            $table->id();
            $table->text('token');
            $table->string('model',70);
            $table->bigInteger('confirmation_id');
            $table->json('data')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->unique(['model', 'confirmation_id']);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('signature_urls');
    }
};
