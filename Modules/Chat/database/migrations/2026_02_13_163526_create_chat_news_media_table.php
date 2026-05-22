<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('chat_news_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_news_id')->constrained('chat_news')->cascadeOnDelete();
            $table->string('type', 10)->index();
            $table->string('path')->nullable();
            $table->integer('size')->nullable();
            $table->string('extension', 10)->nullable();
            $table->tinyInteger('order')->default(1)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('chat_new_media');
    }
};
