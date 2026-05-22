<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('user_mobile_keys', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('device_uuid')->index();          //Mobil qurilma ID
            $table->string('device_model')->nullable();
            $table->string('platform')->nullable(); //ios/Android
            $table->text('fcm_token')->nullable();  //Push uchun
            $table->timestamp('face')->nullable();
            $table->boolean('notifications')->default(false)->index();
            $table->unsignedBigInteger('token_id')->nullable(); //sanctum personal access token ID
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'device_uuid']); //Har bitta user + device uchun 1 yozuv
            $table->index(['user_id', 'device_uuid'], 'user_mobile_keys_user_id_device_uuid_index');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('user_mobile_keys');
    }
};
