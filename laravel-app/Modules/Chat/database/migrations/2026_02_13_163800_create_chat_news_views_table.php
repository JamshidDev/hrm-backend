<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('chat_news_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_news_id')->constrained('chat_news')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['chat_news_id', 'user_id']);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('chat_news_views');
    }
};
