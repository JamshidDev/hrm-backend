<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('chat_categories_news', function (Blueprint $table) {
            $table->foreignId('chat_news_category_id')->constrained('chat_news_categories')->cascadeOnDelete();
            $table->foreignId('chat_news_id')->constrained('chat_news')->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('chat_categories_news');
    }
};
