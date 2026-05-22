<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('hmac_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('public_key')->unique()->index();
            $table->text('secret_key');
            $table->string('secret_type', 20);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['public_key', 'secret_type'], 'public_key_secret_type');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('hmac_users');
    }
};
