<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\Helper;
use App\Helpers\TurnStileHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerTerminalEventsResource extends JsonResource
{
    protected string $date;

    public function __construct($resource, $date)
    {
        parent::__construct($resource);
        $this->date = $date;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'photo'       => Helper::fileUrl($this->photo),
            'last_name'   => $this->last_name,
            'first_name'  => $this->first_name,
            'middle_name' => $this->middle_name,
            'total_minutes' => (int)TurnStileHelper::calcWorkDuration($this->terminal_events, $this->date),
            'on_vacation' => $this->on_vacation,
            'vacation_from' => $this->vacation_from,
            'vacation_to' => $this->vacation_to
        ];
    }

}
