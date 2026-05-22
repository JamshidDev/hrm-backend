<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Exam\Enums\TopicTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('topics', static function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->foreignId('organization_id')
                ->nullable()
                ->constrained('organizations')
                ->cascadeOnDelete();
            $table->tinyInteger('type')->default(TopicTypeEnum::ONE->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('topics');
    }
};
