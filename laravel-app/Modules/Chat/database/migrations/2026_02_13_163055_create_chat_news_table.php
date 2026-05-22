<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('chat_news', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');

            $table->string('slug')->unique();
            $table->tinyInteger('status')->index();
            // 0 = draft
            // 1 = published
            // 2 = archived
            $table->dateTime('published_at')->nullable();
            $table->boolean('is_pinned')->default(false)->index();

            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('dislikes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['organization_id', 'status', 'published_at']);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('chat_news');
    }
};
