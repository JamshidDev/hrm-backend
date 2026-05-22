<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\ContractCommandStatusEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('contracts', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('director_id')->nullable()->constrained('confirmation_workers');
            $table->tinyInteger('command_status')->default(ContractCommandStatusEnum::NOT_CREATED->value);
            $table->string('number', 15)->nullable();
            $table->date('contract_date')->index()->nullable();
            $table->date('contract_to_date')->index()->nullable();
            $table->integer('table_number')->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('generate')->default(1);
            $table->tinyInteger('type')->index()->default(ContractTypeEnum::ONE->value);
            $table->tinyInteger('status')->index()->default(PositionStatusEnum::PROCESS->value);
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
