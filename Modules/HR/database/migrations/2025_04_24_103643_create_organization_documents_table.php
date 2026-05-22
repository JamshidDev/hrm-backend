<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\OrganizationDocumentTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('organization_documents', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('file')->nullable();
            $table->date('document_date')->nullable();
            $table->tinyInteger('type')->default(OrganizationDocumentTypeEnum::ONE->value);
            $table->enum('visibility_type', ['OWN', 'OWN_AND_BELOW', 'ALL'])->default('OWN');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_documents');
    }
};
