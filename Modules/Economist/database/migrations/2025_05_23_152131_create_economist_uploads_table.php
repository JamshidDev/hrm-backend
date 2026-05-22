<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Economist\Enums\UploadTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('economist_uploads', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('user_id')->constrained('users');
            $table->tinyInteger('type')->default(UploadTypeEnum::ONE->value)->index();
            $table->string('file')->nullable();
            $table->integer('year')->index();
            $table->tinyInteger('month')->index();
            $table->tinyInteger('day')->index()->default(1);
            $table->tinyInteger('status')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->tinyInteger('done')->default(1);
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('economist_uploads');
    }
};
