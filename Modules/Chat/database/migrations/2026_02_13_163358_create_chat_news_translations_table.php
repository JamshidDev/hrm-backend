<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('chat_news_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_news_id')->constrained('chat_news')->cascadeOnDelete();
            $table->string('locale', 2)->index();
            $table->string('title')->nullable();
            $table->string('short_description')->nullable();
            $table->text('content')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('chat_new_translations');
    }
};
