<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('oauth_client_codes', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('oauth_client_id')->constrained('oauth_clients')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('code');
            $table->timestamp('expires_at');
            $table->string('scope')->index();
            $table->string('state')->index();
            $table->boolean('used')->default(false);
            $table->timestamps();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('oauth_client_codes');
    }
};
