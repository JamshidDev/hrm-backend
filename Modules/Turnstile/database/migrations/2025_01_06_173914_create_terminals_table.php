<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('terminals', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('building_id')->constrained('buildings');
            $table->string('name', 100)->nullable();
            $table->string('name_ru', 100)->nullable();
            $table->string('name_en', 100)->nullable();
            $table->ipAddress()->nullable()->index();
            $table->ipAddress('server_ip')->nullable()->index();
            $table->string('url')->nullable();
            $table->timestamp('last_updated')->nullable();
            $table->boolean('type')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('terminals');
    }
};
