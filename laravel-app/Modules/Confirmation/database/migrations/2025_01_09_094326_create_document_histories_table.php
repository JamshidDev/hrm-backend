<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\DocumentHistoryStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('document_histories', static function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('model_id');
            $table->string('model_type');
            $table->foreignId('user_id')->constrained('users');
            $table->string('file')->nullable();
            $table->tinyInteger('status')->index()->default(DocumentHistoryStatusEnum::CREATED->value);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('document_histories');
    }
};
