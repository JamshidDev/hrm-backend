<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('deploy_logs', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('version', 5)->unique()->index();
            $table->longText('changes')->nullable();
            $table->string('type', 5)->index()->default('front');
            $table->string('path')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('deploy_logs');
    }
};
