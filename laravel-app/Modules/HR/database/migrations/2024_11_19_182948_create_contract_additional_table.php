<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\ContractAdditionalTypeEnum;
use Modules\HR\Enums\ContractCommandStatusEnum;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contract_additional', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('contract_id')->nullable()->constrained('contracts');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->foreignId('director_id')->nullable()->constrained('confirmation_workers');
            $table->tinyInteger('command_status')->default(ContractCommandStatusEnum::NOT_CREATED->value);
            $table->integer('number')->nullable();
            $table->date('contract_date')->nullable()->index();
            $table->date('contract_to_date')->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('type')->index()->default(ContractAdditionalTypeEnum::ONE->value);
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->tinyInteger('generate')->default(2);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('contract_additional');
    }
};
