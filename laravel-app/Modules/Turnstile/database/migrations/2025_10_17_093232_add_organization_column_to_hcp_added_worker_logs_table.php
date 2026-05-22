<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Turnstile\Models\HcpAddedWorkerLog;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('hcp_added_worker_logs', static function (Blueprint $table) {
            $table->foreignId('organization_id')
                ->nullable()
                ->after('user_id')
                ->constrained('organizations');
        });

        foreach (HcpAddedWorkerLog::with('user')->get() as $item) {
            $item->update(['organization_id' => $item->user?->organization_id]);
        }
    }

    public function down(): void
    {
        Schema::table('hcp_added_worker_logs', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('organization_id');
        });
    }
};
