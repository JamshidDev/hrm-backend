<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('sync_h_c_p_access_logs', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->integer('size')->index()->default(0);
            $table->integer('inserted')->default(0);
            $table->dateTime('from_time')->nullable();
            $table->dateTime('to_time')->nullable();
            $table->tinyInteger('status')->index()->default(1);
            $table->string('error')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('sync_h_c_p_access_logs');
    }
};
