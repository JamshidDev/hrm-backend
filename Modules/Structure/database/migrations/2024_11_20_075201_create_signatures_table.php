<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('signatures', static function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('model_id');
            $table->string('model_type');
            $table->longText('signature')->nullable();
            $table->tinyInteger('type')->default(ConfirmationTypeEnum::DIGITAL->value);
            $table->string('certificate_code')->nullable();
            $table->dateTime('certificate_expired')->nullable();
            $table->boolean('status')->default(false);
            $table->foreignId('user_id')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('signatures');
    }
};
